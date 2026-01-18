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

// POST: Recibir un documento
export async function POST(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { documentoId, destinoId } = body

    if (!documentoId || !destinoId) {
      return NextResponse.json(
        { message: "documentoId y destinoId son requeridos" },
        { status: 400 }
      )
    }

    // Obtener usuario con su dependencia
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { id: true, dependenciaId: true, nombre: true, apellidos: true },
    })

    if (!usuario?.dependenciaId) {
      return NextResponse.json(
        { message: "El usuario no tiene una dependencia asignada" },
        { status: 400 }
      )
    }

    // Verificar que el destino existe y pertenece al documento
    const destino = await prisma.documentoDestino.findUnique({
      where: { id: destinoId },
      include: {
        documento: true,
      },
    })

    if (!destino) {
      return NextResponse.json(
        { message: "Destino no encontrado" },
        { status: 404 }
      )
    }

    if (destino.documentoId !== documentoId) {
      return NextResponse.json(
        { message: "El destino no corresponde al documento" },
        { status: 400 }
      )
    }

    // Verificar que el usuario pertenece a la dependencia destino
    if (destino.dependenciaDestinoId !== usuario.dependenciaId) {
      return NextResponse.json(
        { message: "No pertenece a la dependencia destino de este documento" },
        { status: 403 }
      )
    }

    // Verificar que el documento está en estado válido para recibir
    if (destino.documento.estado !== "ENVIADO" && destino.documento.estado !== "DERIVADO") {
      return NextResponse.json(
        { message: "El documento no está en estado válido para ser recibido" },
        { status: 400 }
      )
    }

    // Verificar que no ha sido recibido ya
    if (destino.estadoRecepcion !== "PENDIENTE") {
      return NextResponse.json(
        { message: "El documento ya fue procesado" },
        { status: 400 }
      )
    }

    // Actualizar el destino como recibido
    await prisma.documentoDestino.update({
      where: { id: destinoId },
      data: {
        estadoRecepcion: "RECIBIDO",
        fechaRecepcion: new Date(),
        receptorId: usuario.id,
      },
    })

    // Verificar si todos los destinos principales han sido recibidos
    const destinosPrincipales = await prisma.documentoDestino.findMany({
      where: {
        documentoId,
        esCopia: false,
      },
    })

    const todosRecibidos = destinosPrincipales.every(
      (d) => d.estadoRecepcion === "RECIBIDO"
    )

    // Si todos los destinos principales han sido recibidos, actualizar estado del documento
    if (todosRecibidos) {
      await prisma.documentoTramite.update({
        where: { id: documentoId },
        data: { estado: "RECIBIDO" },
      })
    }

    // Crear registro en historial
    await prisma.documentoHistorial.create({
      data: {
        documentoId,
        accion: "RECIBIDO",
        usuarioId: usuario.id,
        dependenciaId: usuario.dependenciaId,
        descripcion: `Documento recibido por ${usuario.nombre} ${usuario.apellidos}`,
        estadoAnterior: destino.documento.estado,
        estadoNuevo: todosRecibidos ? "RECIBIDO" : destino.documento.estado,
      },
    })

    // Crear notificación para el remitente
    await prisma.notificacion.create({
      data: {
        usuarioId: destino.documento.remitenteId,
        documentoId,
        tipo: "DOCUMENTO_RECIBIDO",
        titulo: "Documento recibido",
        mensaje: `Tu documento ha sido recibido por ${usuario.nombre} ${usuario.apellidos}`,
        enlace: `/dashboard/tramite/documento/${documentoId}`,
      },
    })

    return NextResponse.json({
      message: "Documento recibido correctamente",
      todosRecibidos
    })
  } catch (error) {
    console.error("Error al recibir documento:", error)
    return NextResponse.json(
      { message: "Error al recibir el documento" },
      { status: 500 }
    )
  }
}
