import { NextRequest, NextResponse } from "next/server"
import { findLoteByCode, getLoteTempPath } from "@/lib/firma-peru/storage"
import { execSync } from "child_process"
import path from "path"
import fs from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params

    console.log(`[Firma Perú] Descarga solicitada para lote: ${codigo}`)

    const loteData = findLoteByCode(codigo)
    if (!loteData) {
      console.error(`[Firma Perú] Lote no encontrado: ${codigo}`)
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 })
    }

    const { params: loteParams } = loteData
    const tempDir = getLoteTempPath(codigo)
    const sourceDir = path.join(tempDir, "source")

    if (!fs.existsSync(sourceDir)) fs.mkdirSync(sourceDir, { recursive: true })

    // Copiar archivos del repositorio al directorio temporal
    let copiedCount = 0
    for (let i = 0; i < loteParams.archivo_ids.length; i++) {
      const ruta = loteParams.archivo_rutas[i]
      if (!ruta) {
        console.error(`[Firma Perú] Ruta vacía para archivo index ${i}`)
        continue
      }

      // La ruta almacenada es /api/uploads/repositorio/userId/year/file.pdf
      // El archivo físico está en uploads/repositorio/userId/year/file.pdf
      const relativePath = ruta.replace(/^\/api\//, "")
      const sourceFile = path.join(process.cwd(), relativePath)

      console.log(`[Firma Perú] Buscando archivo: ${sourceFile}`)

      if (fs.existsSync(sourceFile)) {
        const baseName = path.basename(sourceFile)
        const targetFile = path.join(sourceDir, `${loteParams.archivo_ids[i]}_${baseName}`)
        fs.copyFileSync(sourceFile, targetFile)
        copiedCount++
        console.log(`[Firma Perú] Archivo copiado: ${baseName}`)
      } else {
        console.error(`[Firma Perú] Archivo NO encontrado: ${sourceFile}`)
      }
    }

    if (copiedCount === 0) {
      console.error("[Firma Perú] No se copiaron archivos al directorio temporal")
      return NextResponse.json({ error: "No se encontraron archivos para firmar" }, { status: 404 })
    }

    // Comprimir con 7-Zip (requerido por Firma Perú)
    const sevenZipFilePath = path.join(tempDir, `documentos_${codigo}.7z`)
    if (fs.existsSync(sevenZipFilePath)) fs.unlinkSync(sevenZipFilePath)

    const sevenZipPath = process.env.SEVENZIP_PATH || "C:\\Program Files\\7-Zip\\7z.exe"

    // Usar path.join para construir el glob correctamente en Windows
    const sourceGlob = path.join(sourceDir, "*")

    try {
      const command = `"${sevenZipPath}" a "${sevenZipFilePath}" "${sourceGlob}"`
      console.log(`[Firma Perú] Ejecutando 7z: ${command}`)
      const output = execSync(command, { stdio: "pipe", encoding: "utf-8" })
      console.log(`[Firma Perú] 7z output: ${output.substring(0, 200)}`)
    } catch (zipError) {
      console.error("[Firma Perú] Error al crear 7z:", zipError)
      return NextResponse.json(
        { error: "Error al crear archivo 7z. Verifique que 7-Zip esté instalado." },
        { status: 500 }
      )
    }

    if (!fs.existsSync(sevenZipFilePath)) {
      console.error("[Firma Perú] Archivo 7z no fue creado")
      return NextResponse.json({ error: "Error al crear archivo comprimido" }, { status: 500 })
    }

    const buffer = fs.readFileSync(sevenZipFilePath)
    console.log(`[Firma Perú] 7z creado: ${buffer.length} bytes, ${copiedCount} archivos`)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/x-7z-compressed",
        "Content-Disposition": `attachment; filename="documentos_${codigo}.7z"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("[Firma Perú] Error al descargar lote:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
