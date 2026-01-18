import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validar campos requeridos
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    // Buscar usuario por email con su rol
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        dependencia: true,
        rol: true,  // Incluir datos del rol
      },
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return NextResponse.json(
        { error: "Usuario desactivado. Contacte al administrador." },
        { status: 401 }
      )
    }

    // Verificar si el contrato ha vencido
    if (usuario.fechaFin) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const fechaFin = new Date(usuario.fechaFin)
      fechaFin.setHours(0, 0, 0, 0)

      if (fechaFin < hoy) {
        return NextResponse.json(
          { error: "Su contrato ha vencido. Contacte al administrador." },
          { status: 401 }
        )
      }
    }

    // Verificar contraseña
    const passwordValid = await bcrypt.compare(password, usuario.password)

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // Crear token JWT (guardar codigo del rol, no el ID)
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        rol: usuario.rol.codigo,  // Código del rol (ej: "ADMIN")
        rolId: usuario.rolId,     // ID del rol para queries
        dependenciaId: usuario.dependenciaId,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    )

    // Guardar token en cookie
    const cookieStore = await cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    })

    // Retornar datos del usuario (sin contraseña)
    return NextResponse.json({
      success: true,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        rol: usuario.rol.codigo,
        rolNombre: usuario.rol.nombre,
        rolColor: usuario.rol.color,
        cargo: usuario.cargo,
        dependencia: usuario.dependencia,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
