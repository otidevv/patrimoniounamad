import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ id: string }>
}

// POST: Enviar un documento borrador (requiere firma previa para actas)
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const documento = await prisma.documentoTramite.findUnique({
      where: { id },
      include: {
        tipoDocumento: true,
        destinos: true,
        historial: {
          where: { accion: "FIRMADO" },
        },
      },
    })

    if (!documento) {
      return NextResponse.json({ message: "Documento no encontrado" }, { status: 404 })
    }

    if (documento.remitenteId !== user.id) {
      return NextResponse.json({ message: "Solo el remitente puede enviar el documento" }, { status: 403 })
    }

    if (documento.estado !== "BORRADOR") {
      return NextResponse.json({ message: "Solo se pueden enviar documentos en borrador" }, { status: 400 })
    }

    // Para actas que requieren firma, verificar que esté firmado
    if (documento.tipoDocumento.requiereFirma && documento.tipoDocumento.codigo === "ACTA-ENT") {
      const firmadoPorRemitente = documento.historial.some(
        (h) => h.usuarioId === user.id
      )
      if (!firmadoPorRemitente) {
        return NextResponse.json(
          { message: "Debe firmar digitalmente el documento antes de enviarlo" },
          { status: 400 }
        )
      }
    }

    const ahora = new Date()

    // Actualizar estado a ENVIADO
    await prisma.documentoTramite.update({
      where: { id },
      data: {
        estado: "ENVIADO",
        fechaEnvio: ahora,
      },
    })

    // Registrar en historial
    await prisma.documentoHistorial.create({
      data: {
        documentoId: id,
        accion: "ENVIADO",
        usuarioId: user.id,
        dependenciaId: user.dependenciaId,
        descripcion: "Documento firmado y enviado al destinatario",
        estadoAnterior: "BORRADOR",
        estadoNuevo: "ENVIADO",
      },
    })

    // Crear notificaciones para usuarios de las dependencias destino
    for (const dest of documento.destinos) {
      const usuariosDestino = await prisma.usuario.findMany({
        where: {
          dependenciaId: dest.dependenciaDestinoId,
          activo: true,
        },
        select: { id: true },
      })

      for (const usr of usuariosDestino) {
        await prisma.notificacion.create({
          data: {
            usuarioId: usr.id,
            documentoId: id,
            tipo: "DOCUMENTO_RECIBIDO",
            titulo: "Nueva Acta de Entrega de Bien",
            mensaje: `${user.nombre} ${user.apellidos} te ha enviado un acta de transferencia de bienes firmada`,
            enlace: `/dashboard/tramite/documento/${id}`,
          },
        })
      }
    }

    return NextResponse.json({ success: true, message: "Documento enviado correctamente" })
  } catch (error) {
    console.error("Error al enviar documento:", error)
    return NextResponse.json({ message: "Error al enviar el documento" }, { status: 500 })
  }
}
