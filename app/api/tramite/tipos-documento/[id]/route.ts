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

// GET: Obtener un tipo de documento por ID
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const tipo = await prisma.tipoDocumentoTramite.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documentos: true,
          },
        },
      },
    })

    if (!tipo) {
      return NextResponse.json(
        { message: "Tipo de documento no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(tipo)
  } catch (error) {
    console.error("Error al obtener tipo de documento:", error)
    return NextResponse.json(
      { message: "Error al obtener el tipo de documento" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar un tipo de documento
export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede modificar
    if (user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Verificar que existe
    const tipoExistente = await prisma.tipoDocumentoTramite.findUnique({
      where: { id },
    })

    if (!tipoExistente) {
      return NextResponse.json(
        { message: "Tipo de documento no encontrado" },
        { status: 404 }
      )
    }

    // Si se cambia el código, verificar que no exista
    if (body.codigo && body.codigo !== tipoExistente.codigo) {
      const codigoExistente = await prisma.tipoDocumentoTramite.findUnique({
        where: { codigo: body.codigo },
      })

      if (codigoExistente) {
        return NextResponse.json(
          { message: "Ya existe un tipo de documento con ese código" },
          { status: 400 }
        )
      }
    }

    const tipo = await prisma.tipoDocumentoTramite.update({
      where: { id },
      data: {
        ...(body.codigo && { codigo: body.codigo }),
        ...(body.nombre && { nombre: body.nombre }),
        ...(body.descripcion !== undefined && { descripcion: body.descripcion || null }),
        ...(body.requiereFirma !== undefined && { requiereFirma: body.requiereFirma }),
        ...(body.prefijo !== undefined && { prefijo: body.prefijo || null }),
        ...(body.activo !== undefined && { activo: body.activo }),
      },
    })

    return NextResponse.json(tipo)
  } catch (error) {
    console.error("Error al actualizar tipo de documento:", error)
    return NextResponse.json(
      { message: "Error al actualizar el tipo de documento" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar un tipo de documento
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo admin puede eliminar
    if (user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para realizar esta acción" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verificar que existe y contar documentos asociados
    const tipo = await prisma.tipoDocumentoTramite.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            documentos: true,
          },
        },
      },
    })

    if (!tipo) {
      return NextResponse.json(
        { message: "Tipo de documento no encontrado" },
        { status: 404 }
      )
    }

    // No eliminar si tiene documentos
    if (tipo._count.documentos > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar: tiene ${tipo._count.documentos} documento(s) asociado(s)` },
        { status: 400 }
      )
    }

    await prisma.tipoDocumentoTramite.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Tipo de documento eliminado correctamente" })
  } catch (error) {
    console.error("Error al eliminar tipo de documento:", error)
    return NextResponse.json(
      { message: "Error al eliminar el tipo de documento" },
      { status: 500 }
    )
  }
}
