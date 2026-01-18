import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string
}

async function verifyAuth(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    return decoded
  } catch {
    return null
  }
}

// Calcular hash SHA256 del archivo
function calcularHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

// POST: Subir archivo PDF al repositorio personal
export async function POST(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("archivo") as File
    const nombre = formData.get("nombre") as string
    const carpetaId = formData.get("carpetaId") as string | null
    const firmado = formData.get("firmado") === "true"

    if (!file) {
      return NextResponse.json(
        { error: "No se ha proporcionado ningún archivo" },
        { status: 400 }
      )
    }

    // Validar que sea PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Solo se permiten archivos PDF" },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo no debe superar los 10MB" },
        { status: 400 }
      )
    }

    // Verificar carpeta si se proporciona
    if (carpetaId) {
      const carpeta = await prisma.carpetaRepositorio.findFirst({
        where: {
          id: carpetaId,
          usuarioId: user.id,
        },
      })

      if (!carpeta) {
        return NextResponse.json(
          { error: "La carpeta no existe o no te pertenece" },
          { status: 400 }
        )
      }
    }

    // Crear estructura de carpetas: uploads/repositorio/{USER_ID}/{AÑO}/
    const now = new Date()
    const anio = String(now.getFullYear())

    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      "repositorio",
      user.id,
      anio
    )

    // Crear directorio si no existe
    await mkdir(uploadDir, { recursive: true })

    // Generar nombre de archivo único con UUID
    const uuid = crypto.randomUUID()
    const fileName = `${uuid}.pdf`
    const filePath = path.join(uploadDir, fileName)

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Calcular hash del archivo
    const hashArchivo = calcularHash(buffer)

    // URL relativa para acceder al archivo
    const url = `/api/uploads/repositorio/${user.id}/${anio}/${fileName}`

    // Crear registro en la base de datos
    const archivo = await prisma.archivoRepositorio.create({
      data: {
        nombre: nombre?.trim() || file.name.replace(".pdf", ""),
        nombreArchivo: fileName,
        url,
        tipo: file.type,
        tamanio: file.size,
        usuarioId: user.id,
        carpetaId: carpetaId || null,
        firmado,
        fechaFirma: firmado ? now : null,
        hashArchivo,
      },
      include: {
        carpeta: {
          select: {
            id: true,
            nombre: true,
          },
        },
        _count: {
          select: {
            usosEnTramites: true,
          },
        },
      },
    })

    return NextResponse.json(archivo, { status: 201 })
  } catch (error) {
    console.error("Error al subir archivo:", error)
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    )
  }
}
