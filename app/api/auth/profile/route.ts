import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  email: string
  nombre: string
  apellidos: string
  rol: string
  dependenciaId: string | null
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    const body = await request.json()

    const { nombre, apellidos, telefono } = body

    if (!nombre || !apellidos) {
      return NextResponse.json(
        { error: "Nombre y apellidos son requeridos" },
        { status: 400 }
      )
    }

    const user = await prisma.usuario.update({
      where: { id: decoded.id },
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
