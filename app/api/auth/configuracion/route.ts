import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// GET - Obtener configuración del usuario actual
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // Buscar configuración existente o crear una por defecto
    let configuracion = await prisma.configuracionUsuario.findUnique({
      where: { userId: user.id },
    })

    if (!configuracion) {
      // Crear configuración por defecto
      configuracion = await prisma.configuracionUsuario.create({
        data: {
          userId: user.id,
          theme: "light",
          notificacionesEmail: true,
          notificacionesPush: true,
          idioma: "es",
          vistaCompacta: false,
          mostrarEstado: true,
          mostrarActividad: true,
        },
      })
    }

    return NextResponse.json({ configuracion })
  } catch (error) {
    console.error("Error al obtener configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar configuración del usuario actual
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      theme,
      notificacionesEmail,
      notificacionesPush,
      idioma,
      vistaCompacta,
      mostrarEstado,
      mostrarActividad,
    } = body

    // Validar tema
    if (theme && !["light", "dark", "system"].includes(theme)) {
      return NextResponse.json(
        { error: "Tema inválido" },
        { status: 400 }
      )
    }

    // Actualizar o crear configuración
    const configuracion = await prisma.configuracionUsuario.upsert({
      where: { userId: user.id },
      update: {
        ...(theme !== undefined && { theme }),
        ...(notificacionesEmail !== undefined && { notificacionesEmail }),
        ...(notificacionesPush !== undefined && { notificacionesPush }),
        ...(idioma !== undefined && { idioma }),
        ...(vistaCompacta !== undefined && { vistaCompacta }),
        ...(mostrarEstado !== undefined && { mostrarEstado }),
        ...(mostrarActividad !== undefined && { mostrarActividad }),
      },
      create: {
        userId: user.id,
        theme: theme || "light",
        notificacionesEmail: notificacionesEmail ?? true,
        notificacionesPush: notificacionesPush ?? true,
        idioma: idioma || "es",
        vistaCompacta: vistaCompacta ?? false,
        mostrarEstado: mostrarEstado ?? true,
        mostrarActividad: mostrarActividad ?? true,
      },
    })

    return NextResponse.json({
      message: "Configuración actualizada correctamente",
      configuracion,
    })
  } catch (error) {
    console.error("Error al actualizar configuración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
