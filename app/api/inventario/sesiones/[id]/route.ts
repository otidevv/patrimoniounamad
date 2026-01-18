import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Obtener sesión por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params

    const sesion = await prisma.sesionInventario.findUnique({
      where: { id },
      include: {
        dependencia: {
          select: { id: true, nombre: true, siglas: true },
        },
        sede: {
          select: { id: true, nombre: true },
        },
        responsable: {
          select: { id: true, nombre: true, apellidos: true, email: true },
        },
        participantes: {
          include: {
            usuario: {
              select: { id: true, nombre: true, apellidos: true, email: true },
            },
          },
        },
        verificaciones: {
          orderBy: { fechaVerificacion: "desc" },
          take: 10,
          include: {
            verificador: {
              select: { id: true, nombre: true, apellidos: true },
            },
          },
        },
        bienesSobrantes: {
          include: {
            registradoPor: {
              select: { id: true, nombre: true, apellidos: true },
            },
          },
        },
      },
    })

    if (!sesion) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(sesion)
  } catch (error) {
    console.error("Error al obtener sesión:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar sesión
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, ...data } = body

    // Obtener sesión actual
    const sesionActual = await prisma.sesionInventario.findUnique({
      where: { id },
    })

    if (!sesionActual) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      )
    }

    // Acciones especiales
    if (action === "iniciar") {
      if (sesionActual.estado !== "PROGRAMADA" && sesionActual.estado !== "PAUSADA") {
        return NextResponse.json(
          { error: "Solo se puede iniciar una sesión programada o pausada" },
          { status: 400 }
        )
      }

      const sesionActualizada = await prisma.sesionInventario.update({
        where: { id },
        data: {
          estado: "EN_PROCESO",
          fechaInicio: sesionActual.fechaInicio || new Date(),
        },
      })

      return NextResponse.json(sesionActualizada)
    }

    if (action === "pausar") {
      if (sesionActual.estado !== "EN_PROCESO") {
        return NextResponse.json(
          { error: "Solo se puede pausar una sesión en proceso" },
          { status: 400 }
        )
      }

      const sesionActualizada = await prisma.sesionInventario.update({
        where: { id },
        data: { estado: "PAUSADA" },
      })

      return NextResponse.json(sesionActualizada)
    }

    if (action === "finalizar") {
      if (sesionActual.estado !== "EN_PROCESO" && sesionActual.estado !== "PAUSADA") {
        return NextResponse.json(
          { error: "Solo se puede finalizar una sesión en proceso o pausada" },
          { status: 400 }
        )
      }

      const sesionActualizada = await prisma.sesionInventario.update({
        where: { id },
        data: {
          estado: "FINALIZADA",
          fechaFin: new Date(),
        },
      })

      return NextResponse.json(sesionActualizada)
    }

    if (action === "cancelar") {
      if (sesionActual.estado === "FINALIZADA") {
        return NextResponse.json(
          { error: "No se puede cancelar una sesión finalizada" },
          { status: 400 }
        )
      }

      const sesionActualizada = await prisma.sesionInventario.update({
        where: { id },
        data: { estado: "CANCELADA" },
      })

      return NextResponse.json(sesionActualizada)
    }

    // Actualización normal de datos
    if (sesionActual.estado !== "PROGRAMADA") {
      return NextResponse.json(
        { error: "Solo se pueden editar sesiones programadas" },
        { status: 400 }
      )
    }

    const sesionActualizada = await prisma.sesionInventario.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        dependenciaId: data.dependenciaId || null,
        sedeId: data.sedeId || null,
        ubicacionFisica: data.ubicacionFisica,
        fechaProgramada: data.fechaProgramada
          ? new Date(data.fechaProgramada)
          : undefined,
        observaciones: data.observaciones,
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
      },
    })

    return NextResponse.json(sesionActualizada)
  } catch (error) {
    console.error("Error al actualizar sesión:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar sesión
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar que la sesión existe y está en estado permitido
    const sesion = await prisma.sesionInventario.findUnique({
      where: { id },
      include: {
        _count: { select: { verificaciones: true } },
      },
    })

    if (!sesion) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      )
    }

    if (sesion.estado !== "PROGRAMADA" && sesion.estado !== "CANCELADA") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar sesiones programadas o canceladas" },
        { status: 400 }
      )
    }

    if (sesion._count.verificaciones > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una sesión con verificaciones registradas" },
        { status: 400 }
      )
    }

    await prisma.sesionInventario.delete({ where: { id } })

    return NextResponse.json({ message: "Sesión eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar sesión:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
