import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { getSession } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("foto") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Use JPG, PNG, GIF o WebP" },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 5MB" },
        { status: 400 }
      )
    }

    // Crear directorio si no existe (fuera de public para producción)
    const uploadDir = path.join(process.cwd(), "uploads", "avatars")
    await mkdir(uploadDir, { recursive: true })

    // Generar nombre único para el archivo
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const fileName = `${session.id}-${Date.now()}.${extension}`
    const filePath = path.join(uploadDir, fileName)

    // Guardar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // URL pública de la imagen (servida por API)
    const fotoUrl = `/api/uploads/avatars/${fileName}`

    // Actualizar usuario en la base de datos
    await prisma.usuario.update({
      where: { id: session.id },
      data: {
        foto: fotoUrl,
      },
    })

    return NextResponse.json({
      message: "Foto actualizada correctamente",
      foto: fotoUrl
    })
  } catch (error) {
    console.error("Error al subir foto:", error)
    return NextResponse.json(
      { error: "Error al subir foto" },
      { status: 500 }
    )
  }
}
