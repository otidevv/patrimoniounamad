import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail, getPasswordResetEmailTemplate } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "El correo electrónico es requerido" },
        { status: 400 }
      )
    }

    // Buscar usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Siempre retornar éxito para no revelar si el email existe
    if (!usuario) {
      return NextResponse.json({
        message: "Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.",
      })
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return NextResponse.json({
        message: "Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.",
      })
    }

    // Invalidar tokens anteriores no usados
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: usuario.id,
        used: false,
      },
      data: {
        used: true,
      },
    })

    // Generar token único
    const token = crypto.randomBytes(32).toString("hex")

    // Crear token de recuperación (expira en 1 hora)
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: usuario.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
    })

    // Construir URL de restablecimiento
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    request.headers.get("origin") ||
                    "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    // Enviar correo
    try {
      await sendEmail({
        to: usuario.email,
        subject: "Restablecer contraseña - SIGA Patrimonio UNAMAD",
        html: getPasswordResetEmailTemplate(usuario.nombre, resetUrl),
      })
    } catch (emailError) {
      console.error("Error al enviar correo:", emailError)
      // Eliminar el token si no se pudo enviar el correo
      await prisma.passwordResetToken.delete({
        where: { token },
      })
      return NextResponse.json(
        { error: "Error al enviar el correo. Intente nuevamente más tarde." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.",
    })
  } catch (error) {
    console.error("Error en forgot-password:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
