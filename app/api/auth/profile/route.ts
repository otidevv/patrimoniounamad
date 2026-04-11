import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }
    const body = await request.json()

    const { nombre, apellidos, telefono } = body

    if (!nombre || !apellidos) {
      return NextResponse.json(
        { error: "Nombre y apellidos son requeridos" },
        { status: 400 }
      )
    }

    const user = await prisma.usuario.update({
      where: { id: session.id },
      data: {
        nombre,
        apellidos,
        telefono: telefono || null,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        tipoDocumento: true,
        numeroDocumento: true,
        cargo: true,
        telefono: true,
        foto: true,
        rol: true,
        dependencia: {
          select: {
            id: true,
            nombre: true,
            siglas: true,
          },
        },
        createdAt: true,
      },
    })

    return NextResponse.json({
      message: "Perfil actualizado correctamente",
      user
    })
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar perfil" },
      { status: 500 }
    )
  }
}
