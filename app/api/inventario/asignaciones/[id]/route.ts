import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Detalle de asignación con sus verificaciones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const asignacion = await prisma.asignacionInventario.findUnique({
      where: { id },
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
        usuario: { select: { id: true, nombre: true, apellidos: true } },
        verificaciones: {
          orderBy: { fechaVerificacion: "desc" },
          include: {
            verificador: { select: { id: true, nombre: true, apellidos: true } },
          },
        },
      },
    })

    if (!asignacion) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ asignacion })
  } catch (error) {
    console.error("Error al obtener asignación:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PUT: Cambiar estado de la asignación (enviar, aceptar, rechazar, cerrar)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { accion, observaciones } = body

    const asignacion = await prisma.asignacionInventario.findUnique({
      where: { id },
    })

    if (!asignacion) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Obtener documento del usuario logueado para validación
    const usuarioActual = await prisma.usuario.findUnique({
      where: { id: session.id },
      select: { numeroDocumento: true },
    })

    const esUsuarioAsignado =
      (asignacion.usuarioId && asignacion.usuarioId === session.id) ||
      (usuarioActual?.numeroDocumento && asignacion.numeroDocumento === usuarioActual.numeroDocumento)

    const now = new Date()

    switch (accion) {
      case "enviar": {
        if (asignacion.estado !== "PENDIENTE" && asignacion.estado !== "RECHAZADO") {
          return NextResponse.json(
            { error: "Solo se puede enviar una asignación pendiente o rechazada" },
            { status: 400 }
          )
        }
        const updated = await prisma.asignacionInventario.update({
          where: { id },
          data: { estado: "ENVIADO", fechaEnvio: now },
        })
        return NextResponse.json({ asignacion: updated })
      }

      case "aceptar": {
        if (asignacion.estado !== "ENVIADO") {
          return NextResponse.json(
            { error: "Solo se puede aceptar una asignación enviada" },
            { status: 400 }
          )
        }
        if (!esUsuarioAsignado) {
          return NextResponse.json(
            { error: "Solo el usuario asignado puede aceptar" },
            { status: 403 }
          )
        }
        const updated = await prisma.asignacionInventario.update({
          where: { id },
          data: {
            estado: "ACEPTADO",
            fechaRespuestaUsuario: now,
            observacionesUsuario: observaciones || null,
          },
        })
        return NextResponse.json({ asignacion: updated })
      }

      case "rechazar": {
        if (asignacion.estado !== "ENVIADO") {
          return NextResponse.json(
            { error: "Solo se puede rechazar una asignación enviada" },
            { status: 400 }
          )
        }
        if (!esUsuarioAsignado) {
          return NextResponse.json(
            { error: "Solo el usuario asignado puede rechazar" },
            { status: 403 }
          )
        }
        const updated = await prisma.asignacionInventario.update({
          where: { id },
          data: {
            estado: "RECHAZADO",
            fechaRespuestaUsuario: now,
            observacionesUsuario: observaciones || null,
          },
        })
        return NextResponse.json({ asignacion: updated })
      }

      case "cerrar": {
        if (asignacion.estado !== "ACEPTADO") {
          return NextResponse.json(
            { error: "Solo se puede cerrar una asignación aceptada" },
            { status: 400 }
          )
        }
        const updated = await prisma.asignacionInventario.update({
          where: { id },
          data: { estado: "CERRADO", fechaCierre: now },
        })
        return NextResponse.json({ asignacion: updated })
      }

      case "reabrir": {
        // Permite al verificador reabrir para editar (vuelve a PENDIENTE)
        if (asignacion.estado === "CERRADO") {
          return NextResponse.json(
            { error: "No se puede reabrir una asignación cerrada" },
            { status: 400 }
          )
        }
        const updated = await prisma.asignacionInventario.update({
          where: { id },
          data: { estado: "PENDIENTE", fechaEnvio: null, fechaRespuestaUsuario: null, observacionesUsuario: null },
        })
        return NextResponse.json({ asignacion: updated })
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error al actualizar asignación:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
