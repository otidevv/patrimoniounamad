import { NextResponse } from "next/server"
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
  rolId: string
  dependenciaId: string | null
}

export async function GET() {
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

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
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
