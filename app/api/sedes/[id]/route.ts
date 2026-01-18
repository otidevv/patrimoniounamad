import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ id: string }>
}

// GET: Obtener una sede por ID
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params

    const sede = await prisma.sede.findUnique({
      where: { id },
      include: {
        dependencias: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            siglas: true,
            tipo: true,
            activo: true,
          },
        },
        _count: {
          select: { dependencias: true },
        },
      },
    })

    if (!sede) {
      return NextResponse.json(
        { message: "Sede no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(sede)
  } catch (error) {
    console.error("Error al obtener sede:", error)
    return NextResponse.json(
      { message: "Error al obtener la sede" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar una sede
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verificar que la sede existe
    const sedeExistente = await prisma.sede.findUnique({
      where: { id },
    })

    if (!sedeExistente) {
      return NextResponse.json(
        { message: "Sede no encontrada" },
        { status: 404 }
      )
    }

    // Si se está cambiando el código, verificar que no exista
    if (body.codigo && body.codigo !== sedeExistente.codigo) {
      const codigoExistente = await prisma.sede.findUnique({
        where: { codigo: body.codigo },
      })

      if (codigoExistente) {
        return NextResponse.json(
          { message: "Ya existe una sede con ese código" },
          { status: 400 }
        )
      }
    }

    const sede = await prisma.sede.update({
      where: { id },
      data: {
        ...(body.codigo && { codigo: body.codigo }),
        ...(body.nombre && { nombre: body.nombre }),
        ...(body.direccion !== undefined && { direccion: body.direccion || null }),
        ...(body.ciudad !== undefined && { ciudad: body.ciudad || null }),
        ...(body.telefono !== undefined && { telefono: body.telefono || null }),
        ...(body.email !== undefined && { email: body.email || null }),
        ...(body.activo !== undefined && { activo: body.activo }),
      },
    })

    return NextResponse.json(sede)
  } catch (error) {
    console.error("Error al actualizar sede:", error)
    return NextResponse.json(
      { message: "Error al actualizar la sede" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar una sede
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params

    // Verificar que la sede existe
    const sede = await prisma.sede.findUnique({
      where: { id },
      include: {
        _count: {
          select: { dependencias: true },
        },
      },
    })

    if (!sede) {
      return NextResponse.json(
        { message: "Sede no encontrada" },
        { status: 404 }
      )
    }

    // No permitir eliminar si tiene dependencias
    if (sede._count.dependencias > 0) {
      return NextResponse.json(
        { message: "No se puede eliminar la sede porque tiene dependencias asociadas" },
        { status: 400 }
      )
    }

    await prisma.sede.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Sede eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar sede:", error)
    return NextResponse.json(
      { message: "Error al eliminar la sede" },
      { status: 500 }
    )
  }
}
