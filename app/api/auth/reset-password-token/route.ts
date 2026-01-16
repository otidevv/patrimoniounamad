import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET - Verificar si el token es válido
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Token no proporcionado" },
        { status: 400 }
      )
    }

    // Buscar token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "El enlace de restablecimiento no es válido" },
        { status: 400 }
      )
    }

    if (resetToken.used) {
      return NextResponse.json(
        { error: "Este enlace ya fue utilizado" },
        { status: 400 }
      )
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "El enlace de restablecimiento ha expirado" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      user: {
        nombre: resetToken.user.nombre,
        email: resetToken.user.email,
      },
    })
  } catch (error) {
    console.error("Error al verificar token:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST - Restablecer contraseña con token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token y contraseña son requeridos" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Buscar token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "El enlace de restablecimiento no es válido" },
        { status: 400 }
      )
    }

    if (resetToken.used) {
      return NextResponse.json(
        { error: "Este enlace ya fue utilizado" },
        { status: 400 }
      )
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "El enlace de restablecimiento ha expirado" },
        { status: 400 }
      )
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Actualizar contraseña y marcar token como usado
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ])

    return NextResponse.json({
      message: "Contraseña restablecida correctamente",
    })
  } catch (error) {
    console.error("Error al restablecer contraseña:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
