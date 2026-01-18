import { NextResponse, NextRequest } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import path from "path"

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

// GET - Obtener un archivo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const archivo = await prisma.archivoRepositorio.findFirst({
      where: {
        id,
        usuarioId: user.id,
      },
      include: {
        carpeta: {
          select: {
            id: true,
            nombre: true,
          },
        },
        usosEnTramites: {
          select: {
            id: true,
            documentoId: true,
            documento: {
              select: {
                correlativo: true,
                anio: true,
                asunto: true,
              },
            },
          },
        },
      },
    })

    if (!archivo) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(archivo)
  } catch (error) {
    console.error("Error al obtener archivo:", error)
    return NextResponse.json(
      { error: "Error al obtener el archivo" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar metadata del archivo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { nombre, carpetaId, firmado, fechaFirma } = body

    // Verificar que el archivo existe y pertenece al usuario
    const archivoExistente = await prisma.archivoRepositorio.findFirst({
      where: {
        id,
        usuarioId: user.id,
      },
    })

    if (!archivoExistente) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      )
    }

    // Si se cambia la carpeta, verificar que la nueva carpeta existe y pertenece al usuario
    if (carpetaId !== undefined && carpetaId !== archivoExistente.carpetaId) {
      if (carpetaId) {
        const nuevaCarpeta = await prisma.carpetaRepositorio.findFirst({
          where: {
            id: carpetaId,
            usuarioId: user.id,
          },
        })

        if (!nuevaCarpeta) {
          return NextResponse.json(
            { error: "La carpeta destino no existe" },
            { status: 400 }
          )
        }
      }
    }

    const archivoActualizado = await prisma.archivoRepositorio.update({
      where: { id },
      data: {
        nombre: nombre?.trim() || archivoExistente.nombre,
        carpetaId: carpetaId !== undefined ? carpetaId : archivoExistente.carpetaId,
        firmado: firmado !== undefined ? firmado : archivoExistente.firmado,
        fechaFirma: fechaFirma !== undefined ? (fechaFirma ? new Date(fechaFirma) : null) : archivoExistente.fechaFirma,
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

    return NextResponse.json(archivoActualizado)
  } catch (error) {
    console.error("Error al actualizar archivo:", error)
    return NextResponse.json(
      { error: "Error al actualizar el archivo" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar archivo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    // Verificar que el archivo existe y pertenece al usuario
    const archivo = await prisma.archivoRepositorio.findFirst({
      where: {
        id,
        usuarioId: user.id,
      },
      include: {
        _count: {
          select: {
            usosEnTramites: true,
          },
        },
      },
    })

    if (!archivo) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      )
    }

    // Advertir si está siendo usado en trámites (pero permitir eliminar)
    const enUso = archivo._count.usosEnTramites > 0

    // Eliminar archivo físico
    try {
      // La URL es algo como: /api/uploads/repositorio/userId/2024/archivo.pdf
      // Convertir a ruta de filesystem
      const urlParts = archivo.url.replace("/api/uploads/", "").split("/")
      const filePath = path.join(process.cwd(), "uploads", ...urlParts)
      await unlink(filePath)
    } catch (fsError) {
      // Si no se puede eliminar el archivo físico, solo loggear pero continuar
      console.warn("No se pudo eliminar archivo físico:", fsError)
    }

    // Eliminar registro de la base de datos
    await prisma.archivoRepositorio.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      advertencia: enUso
        ? `El archivo estaba siendo usado en ${archivo._count.usosEnTramites} trámite(s). Los trámites mostrarán "Archivo no disponible".`
        : null,
    })
  } catch (error) {
    console.error("Error al eliminar archivo:", error)
    return NextResponse.json(
      { error: "Error al eliminar el archivo" },
      { status: 500 }
    )
  }
}
