import { NextRequest, NextResponse } from "next/server"
import { readFile, stat } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

// Tipos MIME permitidos
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filePath = pathSegments.join("/")

    // Validar que no haya path traversal
    if (filePath.includes("..") || filePath.includes("~")) {
      return NextResponse.json(
        { error: "Ruta no válida" },
        { status: 400 }
      )
    }

    // Construir ruta completa al archivo
    const uploadsDir = path.join(process.cwd(), "uploads")
    const fullPath = path.join(uploadsDir, filePath)

    // Verificar que el archivo está dentro del directorio de uploads
    if (!fullPath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      )
    }

    // Verificar que el archivo existe
    try {
      await stat(fullPath)
    } catch {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      )
    }

    // Obtener extensión y tipo MIME
    const ext = path.extname(fullPath).toLowerCase()
    const mimeType = MIME_TYPES[ext]

    if (!mimeType) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 400 }
      )
    }

    // Leer y servir el archivo
    const fileBuffer = await readFile(fullPath)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error al servir archivo:", error)
    return NextResponse.json(
      { error: "Error al servir archivo" },
      { status: 500 }
    )
  }
}
