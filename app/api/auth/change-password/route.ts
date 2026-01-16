import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
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

    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Contraseña actual y nueva son requeridas" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.usuario.update({
      where: { id: decoded.id },
      data: {
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      message: "Contraseña cambiada correctamente"
    })
  } catch {
    return NextResponse.json(
      { error: "Error al cambiar contraseña" },
      { status: 500 }
    )
  }
}
