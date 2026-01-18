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

// POST: Crear nuevo documento de trámite
export async function POST(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const {
      tipoDocumentoId,
      correlativo,
      anio,
      asunto,
      referencia, // Campo opcional de referencia
      folios,
      prioridad,
      fechaLimite,
      observaciones,
      estado,
      destinatarios,
      archivo, // Datos del archivo PDF subido
    } = body

    // Validaciones
    if (!tipoDocumentoId || !correlativo || !asunto) {
      return NextResponse.json(
        { message: "Tipo de documento, correlativo y asunto son requeridos" },
        { status: 400 }
      )
    }

    // Validar que se haya subido el archivo PDF
    if (!archivo?.url) {
      return NextResponse.json(
        { message: "El archivo PDF del documento es obligatorio" },
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

    // Verificar que el correlativo no exista para el tipo y año
    const existente = await prisma.documentoTramite.findFirst({
      where: {
        tipoDocumentoId,
        correlativo,
        anio: anio || new Date().getFullYear(),
      },
    })

    if (existente) {
      return NextResponse.json(
        { message: "Ya existe un documento con ese correlativo para este tipo y año" },
        { status: 400 }
      )
    }

    // Crear el documento con el archivo adjunto
    const documento = await prisma.documentoTramite.create({
      data: {
        tipoDocumentoId,
        correlativo,
        anio: anio || new Date().getFullYear(),
        asunto,
        contenido: referencia || null, // Usar el campo contenido para la referencia
        folios: folios || 1,
        prioridad: prioridad || "NORMAL",
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        observaciones,
        estado: estado || "BORRADOR",
        tipoFirma: "ESCANEADO", // Por defecto, ya que siempre se sube un PDF
        dependenciaOrigenId: usuario.dependenciaId,
        remitenteId: usuario.id,
        fechaEnvio: estado === "ENVIADO" ? new Date() : null,
        // Crear destinos con destinatario específico
        destinos: {
          create: destinatarios?.map((dest: { dependenciaId: string; destinatarioId?: string; esCopia: boolean }) => ({
            dependenciaDestinoId: dest.dependenciaId,
            destinatarioId: dest.destinatarioId || null,
            esCopia: dest.esCopia || false,
          })) || [],
        },
        // Crear archivo adjunto (el PDF principal)
        archivosAdjuntos: {
          create: {
            nombre: archivo.nombre,
            url: archivo.url,
            tipo: archivo.tipo,
            tamanio: archivo.tamanio,
            archivoRepositorioId: archivo.archivoRepositorioId || null,
          },
        },
        // Crear historial inicial
        historial: {
          create: {
            accion: "CREADO",
            usuarioId: usuario.id,
            dependenciaId: usuario.dependenciaId,
            descripcion: "Documento creado",
            estadoNuevo: estado || "BORRADOR",
          },
        },
      },
      include: {
        tipoDocumento: true,
        dependenciaOrigen: true,
        remitente: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
        destinos: {
          include: {
            dependenciaDestino: true,
          },
        },
      },
    })

    // Si se envía, crear notificaciones para los destinatarios
    if (estado === "ENVIADO" && destinatarios?.length > 0) {
      // Agregar acción de envío al historial
      await prisma.documentoHistorial.create({
        data: {
          documentoId: documento.id,
          accion: "ENVIADO",
          usuarioId: usuario.id,
          dependenciaId: usuario.dependenciaId,
          descripcion: "Documento enviado",
          estadoAnterior: "BORRADOR",
          estadoNuevo: "ENVIADO",
        },
      })

      // Crear notificaciones para usuarios de las dependencias destino
      for (const dest of destinatarios) {
        const usuariosDestino = await prisma.usuario.findMany({
          where: {
            dependenciaId: dest.dependenciaId,
            activo: true,
          },
          select: { id: true },
        })

        for (const usuarioDest of usuariosDestino) {
          await prisma.notificacion.create({
            data: {
              usuarioId: usuarioDest.id,
              documentoId: documento.id,
              tipo: "DOCUMENTO_RECIBIDO",
              titulo: "Nuevo documento recibido",
              mensaje: `Has recibido un nuevo ${documento.tipoDocumento.nombre}: ${documento.asunto}`,
              enlace: `/dashboard/tramite/documento/${documento.id}`,
            },
          })
        }
      }
    }

    return NextResponse.json(documento, { status: 201 })
  } catch (error) {
    console.error("Error al crear documento:", error)
    return NextResponse.json(
      { message: "Error al crear el documento" },
      { status: 500 }
    )
  }
}

// GET: Obtener documentos (con filtros)
export async function GET(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado")
    const tipoDocumentoId = searchParams.get("tipoDocumentoId")

    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { dependenciaId: true },
    })

    if (!usuario?.dependenciaId) {
      return NextResponse.json([])
    }

    const documentos = await prisma.documentoTramite.findMany({
      where: {
        OR: [
          { dependenciaOrigenId: usuario.dependenciaId },
          { destinos: { some: { dependenciaDestinoId: usuario.dependenciaId } } },
        ],
        ...(estado && { estado: estado as any }),
        ...(tipoDocumentoId && { tipoDocumentoId }),
      },
      include: {
        tipoDocumento: {
          select: { codigo: true, nombre: true },
        },
        dependenciaOrigen: {
          select: { siglas: true, nombre: true },
        },
        remitente: {
          select: { nombre: true, apellidos: true },
        },
        destinos: {
          include: {
            dependenciaDestino: {
              select: { siglas: true, nombre: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(documentos)
  } catch (error) {
    console.error("Error al obtener documentos:", error)
    return NextResponse.json(
      { message: "Error al obtener los documentos" },
      { status: 500 }
    )
  }
}
