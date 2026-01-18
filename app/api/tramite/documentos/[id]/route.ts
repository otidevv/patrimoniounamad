import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string
}

interface Params {
  params: Promise<{ id: string }>
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

// GET: Obtener un documento por ID con todos sus detalles
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const documento = await prisma.documentoTramite.findUnique({
      where: { id },
      include: {
        tipoDocumento: true,
        dependenciaOrigen: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            siglas: true,
          },
        },
        remitente: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            cargo: true,
            email: true,
          },
        },
        destinos: {
          include: {
            dependenciaDestino: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                siglas: true,
              },
            },
            receptor: {
              select: {
                nombre: true,
                apellidos: true,
              },
            },
          },
        },
        archivosAdjuntos: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            tamanio: true,
            url: true,
            createdAt: true,
          },
        },
        historial: {
          include: {
            usuario: {
              select: {
                nombre: true,
                apellidos: true,
              },
            },
            dependencia: {
              select: {
                siglas: true,
                nombre: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!documento) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      )
    }

    // Verificar que el usuario tiene acceso al documento
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { dependenciaId: true },
    })

    const tieneAcceso =
      documento.remitenteId === user.id ||
      documento.dependenciaOrigenId === usuario?.dependenciaId ||
      documento.destinos.some(
        (d) => d.dependenciaDestinoId === usuario?.dependenciaId
      ) ||
      user.rol === "ADMIN"

    if (!tieneAcceso) {
      return NextResponse.json(
        { error: "No tiene acceso a este documento" },
        { status: 403 }
      )
    }

    // Incluir información del usuario actual para validaciones en frontend
    return NextResponse.json({
      ...documento,
      usuarioActual: {
        id: user.id,
        dependenciaId: usuario?.dependenciaId || null,
      }
    })
  } catch (error) {
    console.error("Error al obtener documento:", error)
    return NextResponse.json(
      { message: "Error al obtener el documento" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar un documento (solo borradores)
export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verificar que el documento existe y pertenece al usuario
    const docExistente = await prisma.documentoTramite.findUnique({
      where: { id },
    })

    if (!docExistente) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      )
    }

    if (docExistente.remitenteId !== user.id && user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para modificar este documento" },
        { status: 403 }
      )
    }

    if (docExistente.estado !== "BORRADOR") {
      return NextResponse.json(
        { message: "Solo se pueden modificar documentos en estado borrador" },
        { status: 400 }
      )
    }

    const documento = await prisma.documentoTramite.update({
      where: { id },
      data: {
        ...(body.asunto && { asunto: body.asunto }),
        ...(body.contenido !== undefined && { contenido: body.contenido }),
        ...(body.folios && { folios: body.folios }),
        ...(body.prioridad && { prioridad: body.prioridad }),
        ...(body.fechaLimite !== undefined && {
          fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : null,
        }),
        ...(body.observaciones !== undefined && { observaciones: body.observaciones }),
        ...(body.tipoFirma && { tipoFirma: body.tipoFirma }),
      },
      include: {
        tipoDocumento: true,
        dependenciaOrigen: true,
        destinos: {
          include: {
            dependenciaDestino: true,
          },
        },
      },
    })

    return NextResponse.json(documento)
  } catch (error) {
    console.error("Error al actualizar documento:", error)
    return NextResponse.json(
      { message: "Error al actualizar el documento" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar un documento (solo borradores)
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    // Verificar que el documento existe
    const documento = await prisma.documentoTramite.findUnique({
      where: { id },
    })

    if (!documento) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      )
    }

    // Solo el creador o admin puede eliminar
    if (documento.remitenteId !== user.id && user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar este documento" },
        { status: 403 }
      )
    }

    // Solo se pueden eliminar borradores
    if (documento.estado !== "BORRADOR") {
      return NextResponse.json(
        { message: "Solo se pueden eliminar documentos en estado borrador" },
        { status: 400 }
      )
    }

    // Eliminar en cascada: destinos, historial, archivos, notificaciones
    await prisma.$transaction([
      prisma.documentoDestino.deleteMany({ where: { documentoId: id } }),
      prisma.documentoHistorial.deleteMany({ where: { documentoId: id } }),
      prisma.archivoAdjunto.deleteMany({ where: { documentoId: id } }),
      prisma.notificacion.deleteMany({ where: { documentoId: id } }),
      prisma.documentoTramite.delete({ where: { id } }),
    ])

    return NextResponse.json({ message: "Documento eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar documento:", error)
    return NextResponse.json(
      { message: "Error al eliminar el documento" },
      { status: 500 }
    )
  }
}
