import { NextRequest, NextResponse } from "next/server"
import { findLoteByCode, getLoteTempPath, cleanLoteTempPath } from "@/lib/firma-peru/storage"
import { prisma } from "@/lib/prisma"
import { execSync } from "child_process"
import path from "path"
import fs from "fs"
import crypto from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params

    const loteData = findLoteByCode(codigo)
    if (!loteData) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
    }

    const { params: loteParams } = loteData
    const archivoIds = loteParams.archivo_ids

    // Leer body como raw bytes
    const contentType = request.headers.get("content-type") || ""
    const rawBody = await request.arrayBuffer()
    let buffer = Buffer.from(rawBody)

    // Si es multipart, extraer contenido del archivo
    if (contentType.includes("multipart/form-data")) {
      const boundaryMatch = contentType.match(/boundary=(.+?)(?:;|$)/)
      if (boundaryMatch) {
        const boundary = boundaryMatch[1].replace(/^["']|["']$/g, "")
        const bodyStr = buffer.toString("latin1")
        const headerEnd = bodyStr.indexOf("\r\n\r\n")
        if (headerEnd !== -1) {
          const contentStart = headerEnd + 4
          const contentEnd = bodyStr.lastIndexOf(`--${boundary}`) - 2
          if (contentEnd > contentStart) {
            buffer = Buffer.from(bodyStr.slice(contentStart, contentEnd), "latin1")
          }
        }
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: "No se recibió contenido" }, { status: 400 })
    }

    // Extraer 7z
    const tempDir = getLoteTempPath(codigo)
    const extractDir = path.join(tempDir, "extracted")
    if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true })

    const tempFilePath = path.join(tempDir, "firmados.7z")
    fs.writeFileSync(tempFilePath, buffer)

    const sevenZipPath = process.env.SEVENZIP_PATH || "C:\\Program Files\\7-Zip\\7z.exe"

    try {
      execSync(`"${sevenZipPath}" x "${tempFilePath}" -o"${extractDir}" -y`, { stdio: "pipe" })
    } catch {
      return NextResponse.json({ error: "Error al procesar archivo comprimido" }, { status: 500 })
    }

    // Procesar archivos firmados
    const extractedFiles = fs.readdirSync(extractDir)
    const procesados: string[] = []

    for (const filename of extractedFiles) {
      const parts = filename.split("_")
      if (parts.length < 2) continue

      const archivoId = parts[0]
      if (!archivoIds.includes(archivoId)) continue

      const filePath = path.join(extractDir, filename)
      const fileBuffer = fs.readFileSync(filePath)

      // Calcular nuevo hash
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex")

      // Buscar primero en ArchivoRepositorio (repositorio personal)
      const archivoRepo = await prisma.archivoRepositorio.findUnique({
        where: { id: archivoId },
      })

      if (archivoRepo) {
        // Sobreescribir el archivo original con la versión firmada
        const originalRelativePath = archivoRepo.url.replace(/^\/api\//, "")
        const originalFilePath = path.join(process.cwd(), originalRelativePath)
        const originalDir = path.dirname(originalFilePath)
        if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true })
        fs.copyFileSync(filePath, originalFilePath)

        await prisma.archivoRepositorio.update({
          where: { id: archivoId },
          data: {
            firmado: true,
            fechaFirma: new Date(),
            hashArchivo: hash,
            tamanio: fileBuffer.length,
          },
        })
      } else {
        // Buscar en ArchivoAdjunto (adjuntos de trámite)
        const archivoAdjunto = await prisma.archivoAdjunto.findUnique({
          where: { id: archivoId },
          include: { documento: true },
        })

        if (!archivoAdjunto) continue

        // Sobreescribir el archivo adjunto con la versión firmada
        const originalRelativePath = archivoAdjunto.url.replace(/^\/api\//, "")
        const originalFilePath = path.join(process.cwd(), originalRelativePath)
        const originalDir = path.dirname(originalFilePath)
        if (!fs.existsSync(originalDir)) fs.mkdirSync(originalDir, { recursive: true })
        fs.copyFileSync(filePath, originalFilePath)

        // Actualizar el documento de trámite con la firma
        await prisma.documentoTramite.update({
          where: { id: archivoAdjunto.documentoId },
          data: {
            archivoFirmadoUrl: archivoAdjunto.url,
            firmaDigitalData: hash,
            fechaFirma: new Date(),
            tipoFirma: "DIGITAL",
          },
        })

        // Registrar en historial
        await prisma.documentoHistorial.create({
          data: {
            documentoId: archivoAdjunto.documentoId,
            accion: "FIRMADO",
            usuarioId: loteParams.usuario_id || "",
            descripcion: "Documento firmado digitalmente con Firma Perú",
          },
        })
      }

      procesados.push(archivoId)
    }

    // Limpiar temporales
    cleanLoteTempPath(codigo)

    return NextResponse.json({
      success: true,
      message: "Documentos firmados correctamente",
      procesados: procesados.length,
      total: archivoIds.length,
    })
  } catch (error) {
    console.error("[Firma Perú] Error al cargar lote firmado:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
