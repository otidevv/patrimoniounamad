import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.id },
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
        fotoGoogle: true,
        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            color: true,
          },
        },
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

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Formatear respuesta para compatibilidad
    return NextResponse.json({
      user: {
        ...user,
        foto: user.foto ?? user.fotoGoogle ?? null,
        rol: user.rol.codigo,  // Para compatibilidad, enviar código como "rol"
        rolId: user.rol.id,
        rolNombre: user.rol.nombre,
        rolColor: user.rol.color,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Token inválido" },
      { status: 401 }
    )
  }
}
