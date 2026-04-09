import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ id: string }>
}

// POST: Aceptar transferencia de bienes vinculada a un acta
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { observaciones } = body

    // Obtener el documento con sus transferencias
    const documento = await prisma.documentoTramite.findUnique({
      where: { id },
      include: {
        tipoDocumento: true,
        transferencias: {
          where: { estado: "PENDIENTE" },
          include: {
            verificacion: true,
          },
        },
        destinos: true,
      },
    })

    if (!documento) {
      return NextResponse.json({ message: "Documento no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario es destinatario
    const esDestinatario = documento.destinos.some(
      (d) => d.dependenciaDestinoId === user.dependenciaId
    ) || documento.transferencias.some(
      (t) => t.destinatarioId === user.id
    )

    if (!esDestinatario) {
      return NextResponse.json(
        { message: "Solo el destinatario puede aceptar la transferencia" },
        { status: 403 }
      )
    }

    if (documento.transferencias.length === 0) {
      return NextResponse.json(
        { message: "No hay transferencias pendientes en este documento" },
        { status: 400 }
      )
    }

    // Aceptar todas las transferencias pendientes
    const ahora = new Date()
    for (const transferencia of documento.transferencias) {
      // Actualizar el responsable actual en la verificación (igual que el flujo de mis-bienes)
      await prisma.verificacionBien.update({
        where: { id: transferencia.verificacionId },
        data: {
          dniResponsableActual: transferencia.dniDestinatario,
          nombresResponsableActual: transferencia.nombreDestinatario.split(" ")[0] || transferencia.nombreDestinatario,
          apellidosResponsableActual: transferencia.nombreDestinatario.split(" ").slice(1).join(" ") || "",
          responsableReal: transferencia.nombreDestinatario,
        },
      })

      // Marcar transferencia como aceptada
      await prisma.transferenciaBien.update({
        where: { id: transferencia.id },
        data: {
          estado: "ACEPTADA",
          fechaRespuesta: ahora,
          observacionesDestinatario: observaciones || null,
        },
      })
    }

    // Marcar documento como ATENDIDO
    await prisma.documentoTramite.update({
      where: { id },
      data: { estado: "ATENDIDO" },
    })

    // Marcar destino como RECIBIDO
    for (const destino of documento.destinos) {
      if (destino.dependenciaDestinoId === user.dependenciaId && destino.estadoRecepcion === "PENDIENTE") {
        await prisma.documentoDestino.update({
          where: { id: destino.id },
          data: {
            estadoRecepcion: "RECIBIDO",
            fechaRecepcion: ahora,
            receptorId: user.id,
          },
        })
      }
    }

    // Registrar en historial
    await prisma.documentoHistorial.create({
      data: {
        documentoId: id,
        accion: "ATENDIDO",
        usuarioId: user.id,
        dependenciaId: user.dependenciaId,
        descripcion: `Transferencia de ${documento.transferencias.length} bien(es) aceptada por ${user.nombre} ${user.apellidos}`,
        estadoAnterior: documento.estado,
        estadoNuevo: "ATENDIDO",
      },
    })

    // Notificar al remitente
    await prisma.notificacion.create({
      data: {
        usuarioId: documento.remitenteId,
        documentoId: id,
        tipo: "DOCUMENTO_ATENDIDO",
        titulo: "Transferencia aceptada",
        mensaje: `${user.nombre} ${user.apellidos} ha aceptado la transferencia de ${documento.transferencias.length} bien(es)`,
        enlace: `/dashboard/tramite/documento/${id}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${documento.transferencias.length} bien(es) transferido(s) correctamente`,
      transferenciasAceptadas: documento.transferencias.length,
    })
  } catch (error) {
    console.error("Error al aceptar transferencia:", error)
    return NextResponse.json(
      { message: "Error al aceptar la transferencia" },
      { status: 500 }
    )
  }
}
