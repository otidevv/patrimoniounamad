import { cookies } from "next/headers"
import { unstable_noStore as noStore } from "next/cache"
import jwt from "jsonwebtoken"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/next-auth"
import { Modulo } from "@prisma/client"
import { construirPermisosMap } from "@/lib/validaciones"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

export type PermisosMap = Record<string, {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}>

export interface UserPayload {
  id: string
  email: string
  nombre: string
  apellidos: string
  rol: string       // Código del rol (ej: "ADMIN")
  rolId: string     // ID del rol
  dependenciaId: string | null
}

export async function getSession(): Promise<UserPayload | null> {
  // 1. Intentar con JWT propio (login email/password)
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
      return decoded
    }
  } catch {
    // Token inválido, continuar con NextAuth
  }

  // 2. Intentar con NextAuth (login Google)
  try {
    const nextAuthSession = await getServerSession(authOptions)

    if (nextAuthSession?.user?.email) {
      const usuario = await prisma.usuario.findUnique({
        where: { email: nextAuthSession.user.email },
        include: { rol: true },
      })

      if (usuario && usuario.activo) {
        return {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          rol: usuario.rol.codigo,
          rolId: usuario.rolId,
          dependenciaId: usuario.dependenciaId,
        }
      }
    }
  } catch {
    // NextAuth no disponible
  }

  return null
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}

export async function getCurrentUser() {
  // Desactivar cache para siempre obtener datos actualizados
  noStore()

  try {
    const session = await getSession()

    if (!session) {
      return null
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
        rolId: true,
        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            color: true,
          }
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

    if (!user) return null

    // Return with rol as string (codigo) for backward compatibility
    return {
      ...user,
      foto: user.foto ?? user.fotoGoogle ?? null, // Foto personalizada > foto Google
      rol: user.rol.codigo,  // String for backward compatibility
      rolId: user.rolId,
      rolNombre: user.rol.nombre,
      rolColor: user.rol.color,
    }
  } catch {
    return null
  }
}

export async function getUserPermisos(): Promise<PermisosMap> {
  // Desactivar cache para siempre obtener permisos actualizados
  noStore()

  try {
    const session = await getSession()
    if (!session) return {}

    const modulos = Object.values(Modulo) as string[]

    // Admin siempre tiene todos los permisos
    if (session.rol === "ADMIN") {
      return construirPermisosMap(true, [], modulos)
    }

    let rolId = session.rolId

    // Si no hay rolId en el token (tokens antiguos), buscar por código
    if (!rolId) {
      const rol = await prisma.rol.findUnique({
        where: { codigo: session.rol }
      })
      if (rol) {
        rolId = rol.id
      }
    }

    if (!rolId) return {}

    // Obtener permisos de la base de datos usando rolId
    const permisos = await prisma.permisoRol.findMany({
      where: { rolId },
    })

    return construirPermisosMap(false, permisos, modulos)
  } catch {
    return {}
  }
}

