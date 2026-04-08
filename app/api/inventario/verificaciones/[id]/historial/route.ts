import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Historial completo de movimientos de un bien verificado
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

    // Obtener la verificación
    const verificacion = await prisma.verificacionBien.findUnique({
      where: { id },
      select: {
        id: true,
        codigoPatrimonial: true,
        descripcionSiga: true,
        marcaSiga: true,
        dniResponsableActual: true,
        nombresResponsableActual: true,
        apellidosResponsableActual: true,
        fechaVerificacion: true,
        resultado: true,
        sesion: { select: { codigo: true, nombre: true } },
      },
    })

    if (!verificacion) {
      return NextResponse.json({ error: "Bien no encontrado" }, { status: 404 })
    }

    // Obtener todas las transferencias de este bien (aceptadas y pendientes)
    const transferencias = await prisma.transferenciaBien.findMany({
      where: { verificacionId: id },
      include: {
        remitente: { select: { id: true, nombre: true, apellidos: true } },
        destinatario: { select: { id: true, nombre: true, apellidos: true } },
      },
      orderBy: { fechaSolicitud: "asc" },
    })

    // Construir historial cronológico
    const historial: Array<{
      tipo: string
      fecha: string
      de: string | null
      para: string
      estado: string
      motivo: string | null
      observaciones: string | null
    }> = []

    // Evento inicial: asignación
    historial.push({
      tipo: "ASIGNACION",
      fecha: verificacion.fechaVerificacion.toISOString(),
      de: null,
      para: [verificacion.nombresResponsableActual, verificacion.apellidosResponsableActual].filter(Boolean).join(" ") || "Desconocido",
      estado: "COMPLETADA",
      motivo: `Inventario ${verificacion.sesion.codigo}`,
      observaciones: null,
    })

    // Eventos de transferencia
    for (const t of transferencias) {
      historial.push({
        tipo: "TRANSFERENCIA",
        fecha: t.fechaSolicitud.toISOString(),
        de: t.nombreRemitente,
        para: t.nombreDestinatario,
        estado: t.estado,
        motivo: t.motivo,
        observaciones: t.observacionesDestinatario,
      })
    }

    return NextResponse.json({
      bien: verificacion,
      responsableActual: {
        dni: verificacion.dniResponsableActual,
        nombre: [verificacion.nombresResponsableActual, verificacion.apellidosResponsableActual].filter(Boolean).join(" "),
      },
      historial,
      totalTransferencias: transferencias.filter((t) => t.estado === "ACEPTADA").length,
    })
  } catch (error) {
    console.error("Error al obtener historial:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
