import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT: Aceptar o rechazar transferencia
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

    const transferencia = await prisma.transferenciaBien.findUnique({
      where: { id },
      include: {
        verificacion: {
          select: {
            id: true,
            sesionId: true,
            codigoPatrimonial: true,
            descripcionSiga: true,
            marcaSiga: true,
            modeloSiga: true,
            serieSiga: true,
            colorSiga: true,
            tipoSiga: true,
            dimensionesSiga: true,
            otrosSiga: true,
            resultado: true,
            estadoFisico: true,
            valorSiga: true,
            dependenciaSiga: true,
            ubicacionSiga: true,
          },
        },
      },
    })

    if (!transferencia) {
      return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 })
    }

    if (transferencia.estado !== "PENDIENTE") {
      return NextResponse.json(
        { error: "Esta transferencia ya fue procesada" },
        { status: 400 }
      )
    }

    const now = new Date()

    if (accion === "aceptar") {
      // Actualizar el bien original: cambiar responsable al destinatario
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
      const updated = await prisma.transferenciaBien.update({
        where: { id },
        data: {
          estado: "ACEPTADA",
          fechaRespuesta: now,
          observacionesDestinatario: observaciones || null,
        },
        include: {
          remitente: { select: { id: true, nombre: true, apellidos: true } },
          destinatario: { select: { id: true, nombre: true, apellidos: true } },
        },
      })

      // Si la transferencia está vinculada a un acta de trámite, actualizar el
      // documento (mismo comportamiento que /api/tramite/documentos/[id]/aceptar-transferencia)
      if (transferencia.documentoActaId) {
        const pendientesDelActa = await prisma.transferenciaBien.count({
          where: {
            documentoActaId: transferencia.documentoActaId,
            estado: "PENDIENTE",
          },
        })

        // Solo marcar ATENDIDO cuando no quedan bienes pendientes en el acta
        if (pendientesDelActa === 0) {
          const documento = await prisma.documentoTramite.findUnique({
            where: { id: transferencia.documentoActaId },
            include: { destinos: true },
          })

          if (
            documento &&
            documento.estado !== "ATENDIDO" &&
            documento.estado !== "ARCHIVADO"
          ) {
            await prisma.documentoTramite.update({
              where: { id: documento.id },
              data: { estado: "ATENDIDO" },
            })

            for (const destino of documento.destinos) {
              if (
                (destino.destinatarioId === session.id ||
                  destino.dependenciaDestinoId === session.dependenciaId) &&
                destino.estadoRecepcion === "PENDIENTE"
              ) {
                await prisma.documentoDestino.update({
                  where: { id: destino.id },
                  data: {
                    estadoRecepcion: "RECIBIDO",
                    fechaRecepcion: now,
                    receptorId: session.id,
                  },
                })
              }
            }

            await prisma.documentoHistorial.create({
              data: {
                documentoId: documento.id,
                accion: "ATENDIDO",
                usuarioId: session.id,
                dependenciaId: session.dependenciaId,
                descripcion: `Transferencia del bien ${transferencia.codigoPatrimonial} aceptada por ${session.nombre} ${session.apellidos}`,
                estadoAnterior: documento.estado,
                estadoNuevo: "ATENDIDO",
              },
            })

            await prisma.notificacion.create({
              data: {
                usuarioId: documento.remitenteId,
                documentoId: documento.id,
                tipo: "DOCUMENTO_ATENDIDO",
                titulo: "Transferencia aceptada",
                mensaje: `${session.nombre} ${session.apellidos} ha aceptado la transferencia del bien ${transferencia.codigoPatrimonial}`,
                enlace: `/dashboard/tramite/documento/${documento.id}`,
              },
            })
          }
        }
      }

      return NextResponse.json({
        transferencia: updated,
        mensaje: "Transferencia aceptada. El bien ahora está bajo su responsabilidad.",
      })
    } else if (accion === "rechazar") {
      if (!observaciones?.trim()) {
        return NextResponse.json(
          { error: "Debe indicar el motivo del rechazo" },
          { status: 400 }
        )
      }

      const updated = await prisma.transferenciaBien.update({
        where: { id },
        data: {
          estado: "RECHAZADA",
          fechaRespuesta: now,
          observacionesDestinatario: observaciones,
        },
        include: {
          remitente: { select: { id: true, nombre: true, apellidos: true } },
          destinatario: { select: { id: true, nombre: true, apellidos: true } },
        },
      })

      return NextResponse.json({
        transferencia: updated,
        mensaje: "Transferencia rechazada.",
      })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error al procesar transferencia:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// GET: Historial de transferencias de un bien
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

    const transferencia = await prisma.transferenciaBien.findUnique({
      where: { id },
      include: {
        remitente: { select: { id: true, nombre: true, apellidos: true } },
        destinatario: { select: { id: true, nombre: true, apellidos: true } },
        verificacion: {
          select: {
            id: true,
            codigoPatrimonial: true,
            descripcionSiga: true,
          },
        },
      },
    })

    if (!transferencia) {
      return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ transferencia })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
