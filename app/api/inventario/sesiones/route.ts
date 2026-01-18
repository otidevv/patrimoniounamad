import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Listar sesiones de inventario
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado")
    const dependenciaId = searchParams.get("dependenciaId")
    const sedeId = searchParams.get("sedeId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    // Construir filtros
    const where: Record<string, unknown> = {}

    if (estado) {
      where.estado = estado
    }

    if (dependenciaId) {
      where.dependenciaId = dependenciaId
    }

    if (sedeId) {
      where.sedeId = sedeId
    }

    // Si no es admin, solo ver las sesiones donde participa o es responsable
    if (session.rol !== "ADMIN") {
      where.OR = [
        { responsableId: session.id },
        { participantes: { some: { usuarioId: session.id } } },
      ]
    }

    const [sesiones, total] = await Promise.all([
      prisma.sesionInventario.findMany({
        where,
        include: {
          dependencia: {
            select: { id: true, nombre: true, siglas: true },
          },
          sede: {
            select: { id: true, nombre: true },
          },
          responsable: {
            select: { id: true, nombre: true, apellidos: true },
          },
          _count: {
            select: {
              verificaciones: true,
              participantes: true,
              bienesSobrantes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sesionInventario.count({ where }),
    ])

    return NextResponse.json({
      sesiones,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    console.error("Error al listar sesiones:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Crear nueva sesión de inventario
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      nombre,
      descripcion,
      dependenciaId,
      sedeId,
      ubicacionFisica,
      fechaProgramada,
      participantesIds,
    } = body

    if (!nombre || !fechaProgramada) {
      return NextResponse.json(
        { error: "Nombre y fecha programada son requeridos" },
        { status: 400 }
      )
    }

    // Generar código único
    const year = new Date().getFullYear()
    const lastSession = await prisma.sesionInventario.findFirst({
      where: {
        codigo: { startsWith: `INV-${year}-` },
      },
      orderBy: { codigo: "desc" },
    })

    let nextNumber = 1
    if (lastSession) {
      const lastNumber = parseInt(lastSession.codigo.split("-")[2])
      nextNumber = lastNumber + 1
    }
    const codigo = `INV-${year}-${String(nextNumber).padStart(3, "0")}`

    // Crear la sesión
    const nuevaSesion = await prisma.sesionInventario.create({
      data: {
        codigo,
        nombre,
        descripcion,
        dependenciaId: dependenciaId || null,
        sedeId: sedeId || null,
        ubicacionFisica,
        fechaProgramada: new Date(fechaProgramada),
        responsableId: session.id,
        participantes: participantesIds?.length
          ? {
              create: participantesIds.map((userId: string) => ({
                usuarioId: userId,
                rol: "VERIFICADOR",
              })),
            }
          : undefined,
      },
      include: {
        dependencia: {
          select: { id: true, nombre: true, siglas: true },
        },
        sede: {
          select: { id: true, nombre: true },
        },
        responsable: {
          select: { id: true, nombre: true, apellidos: true },
        },
        participantes: {
          include: {
            usuario: {
              select: { id: true, nombre: true, apellidos: true },
            },
          },
        },
      },
    })

    return NextResponse.json(nuevaSesion, { status: 201 })
  } catch (error) {
    console.error("Error al crear sesión:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
