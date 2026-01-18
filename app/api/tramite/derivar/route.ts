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

// POST: Derivar documento a otra dependencia
export async function POST(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { documentoId, dependenciaDestinoId, destinatarioId, observaciones } = body

    // Validaciones
    if (!documentoId || !dependenciaDestinoId || !destinatarioId) {
      return NextResponse.json(
        { message: "Documento, dependencia destino y destinatario son requeridos" },
        { status: 400 }
      )
    }

    // Obtener usuario con su dependencia
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { id: true, dependenciaId: true },
    })

    if (!usuario?.dependenciaId) {
      return NextResponse.json(
        { message: "El usuario no tiene una dependencia asignada" },
        { status: 400 }
      )
    }

    // Verificar que el documento existe
    const documento = await prisma.documentoTramite.findUnique({
      where: { id: documentoId },
      include: {
        destinos: true,
        tipoDocumento: true,
      },
    })

    if (!documento) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que la dependencia destino existe
    const dependenciaDestino = await prisma.dependencia.findUnique({
      where: { id: dependenciaDestinoId },
    })

    if (!dependenciaDestino) {
      return NextResponse.json(
        { message: "Dependencia destino no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que no se esté derivando a la misma dependencia
    if (dependenciaDestinoId === usuario.dependenciaId) {
      return NextResponse.json(
        { message: "No se puede derivar a la misma dependencia" },
        { status: 400 }
      )
    }

    // Verificar que no exista ya un destino para esta dependencia
    const destinoExistente = documento.destinos.find(
      d => d.dependenciaDestinoId === dependenciaDestinoId
    )

    if (destinoExistente) {
      return NextResponse.json(
        { message: "El documento ya fue enviado a esta dependencia" },
        { status: 400 }
      )
    }

    // Crear el nuevo destino (derivación)
    const nuevoDestino = await prisma.documentoDestino.create({
      data: {
        documentoId,
        dependenciaDestinoId,
        destinatarioId,
        esCopia: false,
        estadoRecepcion: "PENDIENTE",
      },
    })

    // Actualizar estado del documento a DERIVADO
    await prisma.documentoTramite.update({
      where: { id: documentoId },
      data: { estado: "DERIVADO" },
    })

    // Registrar en el historial
    await prisma.documentoHistorial.create({
      data: {
        documentoId,
        accion: "DERIVADO",
        usuarioId: usuario.id,
        dependenciaId: usuario.dependenciaId,
        descripcion: observaciones || `Documento derivado a ${dependenciaDestino.nombre}`,
        estadoAnterior: documento.estado,
        estadoNuevo: "DERIVADO",
      },
    })

    // Crear notificación para el destinatario específico
    await prisma.notificacion.create({
      data: {
        usuarioId: destinatarioId,
        documentoId,
        tipo: "DOCUMENTO_DERIVADO",
        titulo: "Documento derivado recibido",
        mensaje: `Se ha derivado el ${documento.tipoDocumento.nombre}: ${documento.asunto}`,
        enlace: `/dashboard/tramite/documento/${documentoId}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Documento derivado correctamente",
      destino: nuevoDestino,
    })
  } catch (error) {
    console.error("Error al derivar documento:", error)
    return NextResponse.json(
      { message: "Error al derivar el documento" },
      { status: 500 }
    )
  }
}
