import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Listar asignaciones de una sesión o del usuario actual
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sesionId = searchParams.get("sesionId")
    const misAsignaciones = searchParams.get("mis") === "true"

    const where: Record<string, unknown> = {}

    if (sesionId) {
      where.sesionId = sesionId
    }

    if (misAsignaciones) {
      // Buscar por usuarioId O por número de documento del usuario logueado
      const usuario = await prisma.usuario.findUnique({
        where: { id: session.id },
        select: { numeroDocumento: true },
      })

      where.OR = [
        { usuarioId: session.id },
        ...(usuario?.numeroDocumento ? [{ numeroDocumento: usuario.numeroDocumento }] : []),
      ]
    }

    const asignaciones = await prisma.asignacionInventario.findMany({
      where,
      include: {
        sesion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true,
            sigaNombreDependencia: true,
          },
        },
        usuario: {
          select: { id: true, nombre: true, apellidos: true },
        },
        _count: {
          select: { verificaciones: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Auto-vincular usuarioId si se encontró por documento pero no tiene userId
    if (misAsignaciones) {
      for (const asig of asignaciones) {
        if (!asig.usuarioId) {
          await prisma.asignacionInventario.update({
            where: { id: asig.id },
            data: { usuarioId: session.id },
          })
          asig.usuarioId = session.id
        }
      }
    }

    return NextResponse.json({ asignaciones })
  } catch (error) {
    console.error("Error al listar asignaciones:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST: Crear o recuperar asignación existente
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const {
      sesionId,
      usuarioId,
      tipoDocumento,
      numeroDocumento,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
    } = body

    if (!sesionId || !numeroDocumento || !nombres || !apellidoPaterno) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      )
    }

    // Verificar si ya existe una asignación para esta persona en esta sesión
    const existente = await prisma.asignacionInventario.findUnique({
      where: {
        sesionId_numeroDocumento: { sesionId, numeroDocumento },
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true } },
        _count: { select: { verificaciones: true } },
      },
    })

    if (existente) {
      return NextResponse.json({ asignacion: existente, existia: true })
    }

    // Crear nueva asignación
    const asignacion = await prisma.asignacionInventario.create({
      data: {
        sesionId,
        usuarioId: usuarioId || null,
        tipoDocumento: tipoDocumento || "DNI",
        numeroDocumento,
        nombres,
        apellidoPaterno,
        apellidoMaterno: apellidoMaterno || null,
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true } },
        _count: { select: { verificaciones: true } },
      },
    })

    return NextResponse.json({ asignacion, existia: false }, { status: 201 })
  } catch (error) {
    console.error("Error al crear asignación:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
