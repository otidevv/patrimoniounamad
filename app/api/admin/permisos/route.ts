import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"
import { Modulo } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  email: string
  nombre: string
  apellidos: string
  rol: string      // Código del rol (ej: "ADMIN")
  rolId: string    // ID del rol
  dependenciaId: string | null
}

interface PermisosModulo {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

// Verificar permisos del módulo ROLES_PERMISOS
async function verifyRolesPermission(accion: keyof PermisosModulo = "ver"): Promise<{ user: UserPayload; permisos: PermisosModulo } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    let rolId = decoded.rolId

    // Admin siempre tiene todos los permisos
    if (decoded.rol === "ADMIN") {
      return {
        user: decoded,
        permisos: { ver: true, crear: true, editar: true, eliminar: true, reportes: true }
      }
    }

    // Si no hay rolId en el token (tokens antiguos), buscar por código
    if (!rolId) {
      const rol = await prisma.rol.findUnique({
        where: { codigo: decoded.rol }
      })
      if (rol) {
        rolId = rol.id
      }
    }

    if (!rolId) return null

    // Obtener permisos del módulo ROLES_PERMISOS para este rol
    const permiso = await prisma.permisoRol.findFirst({
      where: {
        rolId,
        modulo: "ROLES_PERMISOS"
      }
    })

    if (!permiso || !permiso[accion]) {
      return null
    }

    return {
      user: decoded,
      permisos: {
        ver: permiso.ver,
        crear: permiso.crear,
        editar: permiso.editar,
        eliminar: permiso.eliminar,
        reportes: permiso.reportes
      }
    }
  } catch (error) {
    console.error("[verifyRolesPermission] Error:", error)
    return null
  }
}

// GET - Obtener permisos por rol (usando rolId)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyRolesPermission("ver")
    if (!auth) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const rolId = searchParams.get("rolId")

    if (!rolId) {
      return NextResponse.json(
        { error: "ID del rol requerido" },
        { status: 400 }
      )
    }

    // Verificar que el rol existe
    const rol = await prisma.rol.findUnique({
      where: { id: rolId }
    })

    if (!rol) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Obtener permisos existentes
    const permisosExistentes = await prisma.permisoRol.findMany({
      where: { rolId },
    })

    // Si no hay permisos, crear permisos vacíos por defecto
    if (permisosExistentes.length === 0) {
      const modulos = Object.values(Modulo)
      const permisosDefault = modulos.map(modulo => ({
        rolId,
        modulo,
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
        reportes: false,
      }))
      return NextResponse.json({ permisos: permisosDefault, rol })
    }

    return NextResponse.json({ permisos: permisosExistentes, rol })
  } catch (error) {
    console.error("Error al obtener permisos:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    )
  }
}

// POST - Guardar permisos (usando rolId)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRolesPermission("editar")
    if (!auth) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { rolId, permisos } = body

    if (!rolId || !permisos) {
      return NextResponse.json(
        { error: "Datos incompletos (rolId y permisos requeridos)" },
        { status: 400 }
      )
    }

    // Verificar que el rol existe
    const rol = await prisma.rol.findUnique({
      where: { id: rolId }
    })

    if (!rol) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // Convertir el array de permisos a un mapa para fácil acceso
    const permisosMap = new Map<string, typeof permisos[0]>()
    for (const p of permisos) {
      permisosMap.set(p.modulo, p)
    }

    // Eliminar permisos existentes del rol
    await prisma.permisoRol.deleteMany({
      where: { rolId },
    })

    // Crear permisos para TODOS los módulos
    const todosModulos = Object.values(Modulo)
    for (const modulo of todosModulos) {
      const permiso = permisosMap.get(modulo)
      await prisma.permisoRol.create({
        data: {
          rolId,
          modulo: modulo,
          ver: permiso?.ver ?? false,
          crear: permiso?.crear ?? false,
          editar: permiso?.editar ?? false,
          eliminar: permiso?.eliminar ?? false,
          reportes: permiso?.reportes ?? false,
        },
      })
    }

    // Revalidar todas las páginas del dashboard para reflejar los cambios
    revalidatePath("/dashboard", "layout")

    return NextResponse.json({
      message: "Permisos guardados correctamente",
    })
  } catch (error) {
    console.error("Error al guardar permisos:", error)
    return NextResponse.json(
      { error: "Error al guardar permisos" },
      { status: 500 }
    )
  }
}

