import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
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

// POST: Subir archivo PDF del documento
export async function POST(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("archivo") as File
    const tipoDocumentoCodigo = formData.get("tipoDocumentoCodigo") as string
    const correlativo = formData.get("correlativo") as string
    const anio = formData.get("anio") as string

    if (!file) {
      return NextResponse.json(
        { message: "No se ha proporcionado ningún archivo" },
        { status: 400 }
      )
    }

    // Validar que sea PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { message: "Solo se permiten archivos PDF" },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "El archivo no debe superar los 10MB" },
        { status: 400 }
      )
    }

    // Obtener dependencia del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: {
        dependencia: {
          select: { siglas: true, codigo: true }
        }
      }
    })

    if (!usuario?.dependencia) {
      return NextResponse.json(
        { message: "El usuario no tiene dependencia asignada" },
        { status: 400 }
      )
    }

    // Crear estructura de carpetas: uploads/tramite/{año}/{mes}/{dependencia}/
    const now = new Date()
    const mes = String(now.getMonth() + 1).padStart(2, "0")
    const yearStr = anio || String(now.getFullYear())
    const dependenciaSiglas = usuario.dependencia.siglas || usuario.dependencia.codigo

    // Sanitizar valores para evitar caracteres problemáticos en el path
    const sanitize = (str: string) => str.replace(/[\/\\:*?"<>|]/g, "-")

    const safeTipoDoc = sanitize(tipoDocumentoCodigo || "DOC")
    const safeCorrelativo = sanitize(correlativo || "000")
    const safeDependencia = sanitize(dependenciaSiglas)

    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      "tramite",
      yearStr,
      mes,
      safeDependencia
    )

    // Crear directorio si no existe
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err: any) {
      if (err.code !== "EEXIST") {
        console.error("Error al crear directorio:", err)
        throw err
      }
    }

    // Generar nombre de archivo: {TIPO}-{CORRELATIVO}-{AÑO}.pdf
    const fileName = `${safeTipoDoc}-${safeCorrelativo}-${yearStr}.pdf`
    const filePath = path.join(uploadDir, fileName)

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // URL relativa para acceder al archivo (a través de la API de uploads)
    const relativePath = `/api/uploads/tramite/${yearStr}/${mes}/${safeDependencia}/${fileName}`

    return NextResponse.json({
      success: true,
      url: relativePath,
      nombre: fileName,
      tipo: file.type,
      tamanio: file.size,
    })
  } catch (error) {
    console.error("Error al subir archivo:", error)
    return NextResponse.json(
      { message: "Error al subir el archivo" },
      { status: 500 }
    )
  }
}
