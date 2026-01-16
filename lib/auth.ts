import { cookies } from "next/headers"
import { unstable_noStore as noStore } from "next/cache"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"
import { Modulo } from "@prisma/client"

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
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    return decoded
  } catch {
    return null
  }
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

    // Admin siempre tiene todos los permisos
    if (session.rol === "ADMIN") {
      const modulos = Object.values(Modulo)
      const permisosMap: PermisosMap = {}
      for (const modulo of modulos) {
        permisosMap[modulo] = {
          ver: true,
          crear: true,
          editar: true,
          eliminar: true,
          reportes: true,
        }
      }
      return permisosMap
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

    // Convertir a un objeto más fácil de usar
    const permisosMap: PermisosMap = {}
    const modulos = Object.values(Modulo)

    // Inicializar todos los módulos con permisos vacíos
    for (const modulo of modulos) {
      permisosMap[modulo] = {
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
        reportes: false,
      }
    }

    // Sobrescribir con permisos de la base de datos
    for (const permiso of permisos) {
      permisosMap[permiso.modulo] = {
        ver: permiso.ver,
        crear: permiso.crear,
        editar: permiso.editar,
        eliminar: permiso.eliminar,
        reportes: permiso.reportes,
      }
    }

    return permisosMap
  } catch {
    return {}
  }
}

