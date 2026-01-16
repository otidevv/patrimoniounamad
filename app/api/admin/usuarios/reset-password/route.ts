import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string      // Código del rol (ej: "ADMIN")
  rolId: string    // ID del rol
}

// Verificar si el usuario tiene permiso de editar usuarios
async function verifyEditPermission(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return false

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    let rolId = decoded.rolId

    // Admin siempre tiene acceso
    if (decoded.rol === "ADMIN") return true

    // Si no hay rolId en el token (tokens antiguos), buscar por código
    if (!rolId) {
      const rol = await prisma.rol.findUnique({
        where: { codigo: decoded.rol }
      })
      if (rol) {
        rolId = rol.id
      }
    }

    if (!rolId) return false

    // Verificar permisos del módulo USUARIOS
    const permiso = await prisma.permisoRol.findFirst({
      where: {
        rolId,
        modulo: "USUARIOS"
      }
    })

    return permiso?.editar ?? false
  } catch {
    return false
  }
}

// POST - Resetear contraseña de usuario
export async function POST(request: NextRequest) {
  try {
    const hasPermission = await verifyEditPermission()
    if (!hasPermission) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "ID de usuario y nueva contraseña son requeridos" },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.usuario.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      message: "Contraseña restablecida correctamente",
    })
  } catch (error) {
    console.error("Error al resetear contraseña:", error)
    return NextResponse.json(
      { error: "Error al resetear contraseña" },
      { status: 500 }
    )
  }
}
