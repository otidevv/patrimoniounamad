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

// GET: Obtener todas las dependencias con detalles completos
export async function GET(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sedeId = searchParams.get("sedeId")
    const tipo = searchParams.get("tipo")
    const activo = searchParams.get("activo")

    const dependencias = await prisma.dependencia.findMany({
      where: {
        ...(sedeId && { sedeId }),
        ...(tipo && { tipo: tipo as any }),
        ...(activo !== null && activo !== undefined && { activo: activo === "true" }),
      },
      include: {
        sede: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        parent: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            siglas: true,
          },
        },
        _count: {
          select: {
            usuarios: true,
            bienes: true,
            hijos: true,
          },
        },
      },
      orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
    })

    return NextResponse.json(dependencias)
  } catch (error) {
    console.error("Error al obtener dependencias:", error)
    return NextResponse.json(
      { message: "Error al obtener las dependencias" },
      { status: 500 }
    )
  }
}

// POST: Crear nueva dependencia
export async function POST(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { codigo, nombre, siglas, tipo, sedeId, parentId } = body

    // Validaciones
    if (!codigo || !nombre || !tipo || !sedeId) {
      return NextResponse.json(
        { message: "Código, nombre, tipo y sede son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el código no exista
    const existente = await prisma.dependencia.findUnique({
      where: { codigo },
    })

    if (existente) {
      return NextResponse.json(
        { message: "Ya existe una dependencia con ese código" },
        { status: 400 }
      )
    }

    // Verificar que la sede existe
    const sede = await prisma.sede.findUnique({
      where: { id: sedeId },
    })

    if (!sede) {
      return NextResponse.json(
        { message: "La sede seleccionada no existe" },
        { status: 400 }
      )
    }

    // Si se especifica parentId, verificar que existe
    if (parentId) {
      const parent = await prisma.dependencia.findUnique({
        where: { id: parentId },
      })

      if (!parent) {
        return NextResponse.json(
          { message: "La dependencia superior seleccionada no existe" },
          { status: 400 }
        )
      }
    }

    const dependencia = await prisma.dependencia.create({
      data: {
        codigo,
        nombre,
        siglas: siglas || null,
        tipo,
        sedeId,
        parentId: parentId || null,
      },
      include: {
        sede: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        parent: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            siglas: true,
          },
        },
      },
    })

    return NextResponse.json(dependencia, { status: 201 })
  } catch (error) {
    console.error("Error al crear dependencia:", error)
    return NextResponse.json(
      { message: "Error al crear la dependencia" },
      { status: 500 }
    )
  }
}
