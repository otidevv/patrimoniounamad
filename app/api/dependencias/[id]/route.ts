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

// GET: Obtener una dependencia por ID
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const dependencia = await prisma.dependencia.findUnique({
      where: { id },
      include: {
        sede: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        parent: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            siglas: true,
          },
        },
        hijos: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            siglas: true,
            tipo: true,
            activo: true,
          },
        },
        usuarios: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            cargo: true,
            activo: true,
          },
        },
        _count: {
          select: {
            usuarios: true,
            bienes: true,
            hijos: true,
          },
        },
      },
    })

    if (!dependencia) {
      return NextResponse.json(
        { message: "Dependencia no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(dependencia)
  } catch (error) {
    console.error("Error al obtener dependencia:", error)
    return NextResponse.json(
      { message: "Error al obtener la dependencia" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar una dependencia
export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verificar que la dependencia existe
    const dependenciaExistente = await prisma.dependencia.findUnique({
      where: { id },
    })

    if (!dependenciaExistente) {
      return NextResponse.json(
        { message: "Dependencia no encontrada" },
        { status: 404 }
      )
    }

    // Si se está cambiando el código, verificar que no exista
    if (body.codigo && body.codigo !== dependenciaExistente.codigo) {
      const codigoExistente = await prisma.dependencia.findUnique({
        where: { codigo: body.codigo },
      })

      if (codigoExistente) {
        return NextResponse.json(
          { message: "Ya existe una dependencia con ese código" },
          { status: 400 }
        )
      }
    }

    // Si se está asignando un parentId, verificar que no cree ciclos
    if (body.parentId) {
      // No puede ser su propio padre
      if (body.parentId === id) {
        return NextResponse.json(
          { message: "Una dependencia no puede ser su propia dependencia superior" },
          { status: 400 }
        )
      }

      // Verificar que no sea uno de sus hijos (evitar ciclos)
      const esHijo = await verificarSiEsHijo(id, body.parentId)
      if (esHijo) {
        return NextResponse.json(
          { message: "No se puede asignar una dependencia hija como dependencia superior" },
          { status: 400 }
        )
      }
    }

    const dependencia = await prisma.dependencia.update({
      where: { id },
      data: {
        ...(body.codigo && { codigo: body.codigo }),
        ...(body.nombre && { nombre: body.nombre }),
        ...(body.siglas !== undefined && { siglas: body.siglas || null }),
        ...(body.tipo && { tipo: body.tipo }),
        ...(body.sedeId && { sedeId: body.sedeId }),
        ...(body.parentId !== undefined && { parentId: body.parentId || null }),
        ...(body.activo !== undefined && { activo: body.activo }),
      },
      include: {
        sede: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        parent: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            siglas: true,
          },
        },
      },
    })

    return NextResponse.json(dependencia)
  } catch (error) {
    console.error("Error al actualizar dependencia:", error)
    return NextResponse.json(
      { message: "Error al actualizar la dependencia" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar una dependencia
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    // Verificar que la dependencia existe
    const dependencia = await prisma.dependencia.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            usuarios: true,
            bienes: true,
            hijos: true,
            documentosOrigen: true,
            documentosDestino: true,
          },
        },
      },
    })

    if (!dependencia) {
      return NextResponse.json(
        { message: "Dependencia no encontrada" },
        { status: 404 }
      )
    }

    // Verificar restricciones
    if (dependencia._count.usuarios > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar: tiene ${dependencia._count.usuarios} usuario(s) asignado(s)` },
        { status: 400 }
      )
    }

    if (dependencia._count.bienes > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar: tiene ${dependencia._count.bienes} bien(es) asignado(s)` },
        { status: 400 }
      )
    }

    if (dependencia._count.hijos > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar: tiene ${dependencia._count.hijos} dependencia(s) hija(s)` },
        { status: 400 }
      )
    }

    if (dependencia._count.documentosOrigen > 0 || dependencia._count.documentosDestino > 0) {
      return NextResponse.json(
        { message: "No se puede eliminar: tiene documentos de trámite asociados" },
        { status: 400 }
      )
    }

    await prisma.dependencia.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Dependencia eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar dependencia:", error)
    return NextResponse.json(
      { message: "Error al eliminar la dependencia" },
      { status: 500 }
    )
  }
}

// Función auxiliar para verificar si una dependencia es hija de otra
async function verificarSiEsHijo(padreId: string, posibleHijoId: string): Promise<boolean> {
  const hijos = await prisma.dependencia.findMany({
    where: { parentId: padreId },
    select: { id: true },
  })

  for (const hijo of hijos) {
    if (hijo.id === posibleHijoId) {
      return true
    }
    // Verificar recursivamente
    const esHijoRecursivo = await verificarSiEsHijo(hijo.id, posibleHijoId)
    if (esHijoRecursivo) {
      return true
    }
  }

  return false
}
