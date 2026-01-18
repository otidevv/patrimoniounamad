import { NextResponse, NextRequest } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
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

// GET - Obtener una carpeta específica con su contenido
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

    const carpeta = await prisma.carpetaRepositorio.findFirst({
      where: {
        id,
        usuarioId: user.id,
      },
      include: {
        parent: {
          select: {
            id: true,
            nombre: true,
          },
        },
        hijos: {
          orderBy: { nombre: "asc" },
          include: {
            _count: {
              select: {
                hijos: true,
                archivos: true,
              },
            },
          },
        },
        archivos: {
          orderBy: { nombre: "asc" },
        },
        _count: {
          select: {
            hijos: true,
            archivos: true,
          },
        },
      },
    })

    if (!carpeta) {
      return NextResponse.json(
        { error: "Carpeta no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(carpeta)
  } catch (error) {
    console.error("Error al obtener carpeta:", error)
    return NextResponse.json(
      { error: "Error al obtener la carpeta" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar carpeta
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
    const { nombre, descripcion, color, parentId } = body

    // Verificar que la carpeta existe y pertenece al usuario
    const carpetaExistente = await prisma.carpetaRepositorio.findFirst({
      where: {
        id,
        usuarioId: user.id,
      },
    })

    if (!carpetaExistente) {
      return NextResponse.json(
        { error: "Carpeta no encontrada" },
        { status: 404 }
      )
    }

    // Si se cambia el parentId, verificar que el nuevo padre sea válido
    if (parentId !== undefined && parentId !== carpetaExistente.parentId) {
      // No puede ser su propio padre
      if (parentId === id) {
        return NextResponse.json(
          { error: "Una carpeta no puede ser su propia subcarpeta" },
          { status: 400 }
        )
      }

      // Si tiene parentId, verificar que existe y pertenece al usuario
      if (parentId) {
        const nuevoPadre = await prisma.carpetaRepositorio.findFirst({
          where: {
            id: parentId,
            usuarioId: user.id,
          },
        })

        if (!nuevoPadre) {
          return NextResponse.json(
            { error: "La carpeta destino no existe" },
            { status: 400 }
          )
        }

        // Verificar que no sea un descendiente (evitar bucles)
        const esDescendiente = await verificarDescendiente(id, parentId)
        if (esDescendiente) {
          return NextResponse.json(
            { error: "No puedes mover una carpeta dentro de sus subcarpetas" },
            { status: 400 }
          )
        }
      }
    }

    // Verificar nombre único en el nuevo nivel
    if (nombre && nombre.trim() !== carpetaExistente.nombre) {
      const nombreDuplicado = await prisma.carpetaRepositorio.findFirst({
        where: {
          usuarioId: user.id,
          parentId: parentId !== undefined ? parentId : carpetaExistente.parentId,
          nombre: nombre.trim(),
          NOT: { id },
        },
      })

      if (nombreDuplicado) {
        return NextResponse.json(
          { error: "Ya existe una carpeta con ese nombre en esta ubicación" },
          { status: 400 }
        )
      }
    }

    const carpetaActualizada = await prisma.carpetaRepositorio.update({
      where: { id },
      data: {
        nombre: nombre?.trim() || carpetaExistente.nombre,
        descripcion: descripcion !== undefined ? descripcion?.trim() || null : carpetaExistente.descripcion,
        color: color !== undefined ? color || null : carpetaExistente.color,
        parentId: parentId !== undefined ? parentId : carpetaExistente.parentId,
      },
      include: {
        _count: {
          select: {
            hijos: true,
            archivos: true,
          },
        },
      },
    })

    return NextResponse.json(carpetaActualizada)
  } catch (error) {
    console.error("Error al actualizar carpeta:", error)
    return NextResponse.json(
      { error: "Error al actualizar la carpeta" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar carpeta
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

    // Verificar que la carpeta existe y pertenece al usuario
    const carpeta = await prisma.carpetaRepositorio.findFirst({
      where: {
        id,
        usuarioId: user.id,
      },
      include: {
        _count: {
          select: {
            hijos: true,
            archivos: true,
          },
        },
      },
    })

    if (!carpeta) {
      return NextResponse.json(
        { error: "Carpeta no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que no tenga contenido
    if (carpeta._count.hijos > 0 || carpeta._count.archivos > 0) {
      return NextResponse.json(
        { error: "No puedes eliminar una carpeta que contiene archivos o subcarpetas" },
        { status: 400 }
      )
    }

    await prisma.carpetaRepositorio.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar carpeta:", error)
    return NextResponse.json(
      { error: "Error al eliminar la carpeta" },
      { status: 500 }
    )
  }
}

// Función auxiliar para verificar si una carpeta es descendiente de otra
async function verificarDescendiente(carpetaId: string, posibleDescendienteId: string): Promise<boolean> {
  let actual = posibleDescendienteId

  while (actual) {
    const carpeta = await prisma.carpetaRepositorio.findUnique({
      where: { id: actual },
      select: { parentId: true },
    })

    if (!carpeta) return false
    if (carpeta.parentId === carpetaId) return true

    actual = carpeta.parentId || ""
    if (!carpeta.parentId) break
  }

  return false
}
