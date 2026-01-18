import { NextResponse } from "next/server"
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

// GET - Listar carpetas del usuario
export async function GET(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get("parentId")

    // Obtener carpetas del usuario
    const carpetas = await prisma.carpetaRepositorio.findMany({
      where: {
        usuarioId: user.id,
        parentId: parentId || null,
      },
      include: {
        _count: {
          select: {
            hijos: true,
            archivos: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(carpetas)
  } catch (error) {
    console.error("Error al listar carpetas:", error)
    return NextResponse.json(
      { error: "Error al listar carpetas" },
      { status: 500 }
    )
  }
}

// POST - Crear nueva carpeta
export async function POST(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, descripcion, color, parentId } = body

    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { error: "El nombre de la carpeta es requerido" },
        { status: 400 }
      )
    }

    // Si tiene parentId, verificar que la carpeta padre pertenece al usuario
    if (parentId) {
      const carpetaPadre = await prisma.carpetaRepositorio.findFirst({
        where: {
          id: parentId,
          usuarioId: user.id,
        },
      })

      if (!carpetaPadre) {
        return NextResponse.json(
          { error: "La carpeta padre no existe o no te pertenece" },
          { status: 400 }
        )
      }
    }

    // Verificar que no exista una carpeta con el mismo nombre en el mismo nivel
    const carpetaExistente = await prisma.carpetaRepositorio.findFirst({
      where: {
        usuarioId: user.id,
        parentId: parentId || null,
        nombre: nombre.trim(),
      },
    })

    if (carpetaExistente) {
      return NextResponse.json(
        { error: "Ya existe una carpeta con ese nombre en esta ubicación" },
        { status: 400 }
      )
    }

    const carpeta = await prisma.carpetaRepositorio.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        color: color || null,
        usuarioId: user.id,
        parentId: parentId || null,
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

    return NextResponse.json(carpeta, { status: 201 })
  } catch (error) {
    console.error("Error al crear carpeta:", error)
    return NextResponse.json(
      { error: "Error al crear la carpeta" },
      { status: 500 }
    )
  }
}
