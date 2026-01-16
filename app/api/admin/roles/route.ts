import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"
import { Modulo } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string
  rolId: string
}

// Verificar permisos del módulo ROLES_PERMISOS
async function verifyRolesPermission(accion: "ver" | "crear" | "editar" | "eliminar" = "ver"): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return false

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload

    // Admin siempre tiene acceso
    if (decoded.rol === "ADMIN") return true

    // Obtener permisos del módulo ROLES_PERMISOS
    const permiso = await prisma.permisoRol.findFirst({
      where: {
        rolId: decoded.rolId,
        modulo: "ROLES_PERMISOS"
      }
    })

    return permiso?.[accion] ?? false
  } catch {
    return false
  }
}

// GET - Obtener todos los roles
export async function GET() {
  try {
    const hasPermission = await verifyRolesPermission("ver")
    if (!hasPermission) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const roles = await prisma.rol.findMany({
      where: { activo: true },
      orderBy: [
        { esSistema: "desc" },  // Primero los del sistema
        { nombre: "asc" }
      ],
    })

    return NextResponse.json({
      roles: roles.map(rol => ({
        id: rol.id,
        codigo: rol.codigo,
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        color: rol.color,
        esSistema: rol.esSistema,
      })),
      total: roles.length,
    })
  } catch (error) {
    console.error("Error al obtener roles:", error)
    return NextResponse.json(
      { error: "Error al obtener roles" },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo rol
export async function POST(request: NextRequest) {
  try {
    const hasPermission = await verifyRolesPermission("crear")
    if (!hasPermission) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { codigo, nombre, descripcion, color } = body

    if (!codigo || !nombre) {
      return NextResponse.json(
        { error: "Código y nombre son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que no exista otro rol con el mismo código
    const existingRol = await prisma.rol.findUnique({
      where: { codigo: codigo.toUpperCase() },
    })

    if (existingRol) {
      return NextResponse.json(
        { error: "Ya existe un rol con este código" },
        { status: 400 }
      )
    }

    // Crear el rol
    const nuevoRol = await prisma.rol.create({
      data: {
        codigo: codigo.toUpperCase(),
        nombre,
        descripcion: descripcion || null,
        color: color || "#6b7280",
        esSistema: false,
      },
    })

    // Crear permisos por defecto para todos los módulos (todo en false)
    const modulos = Object.values(Modulo)
    await prisma.permisoRol.createMany({
      data: modulos.map(modulo => ({
        rolId: nuevoRol.id,
        modulo,
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
        reportes: false,
      })),
    })

    return NextResponse.json({
      message: "Rol creado correctamente",
      rol: nuevoRol,
    })
  } catch (error) {
    console.error("Error al crear rol:", error)
    return NextResponse.json(
      { error: "Error al crear rol" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar rol
export async function PUT(request: NextRequest) {
  try {
    const hasPermission = await verifyRolesPermission("editar")
    if (!hasPermission) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { id, nombre, descripcion, color, activo } = body

    if (!id) {
      return NextResponse.json(
        { error: "ID del rol es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el rol existe
    const rolExistente = await prisma.rol.findUnique({
      where: { id },
    })

    if (!rolExistente) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // No permitir editar código de roles del sistema
    // (pero sí nombre, descripción y color)

    // Actualizar el rol
    const rolActualizado = await prisma.rol.update({
      where: { id },
      data: {
        nombre: nombre ?? rolExistente.nombre,
        descripcion: descripcion !== undefined ? descripcion : rolExistente.descripcion,
        color: color ?? rolExistente.color,
        activo: activo !== undefined ? activo : rolExistente.activo,
      },
    })

    return NextResponse.json({
      message: "Rol actualizado correctamente",
      rol: rolActualizado,
    })
  } catch (error) {
    console.error("Error al actualizar rol:", error)
    return NextResponse.json(
      { error: "Error al actualizar rol" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar rol
export async function DELETE(request: NextRequest) {
  try {
    const hasPermission = await verifyRolesPermission("eliminar")
    if (!hasPermission) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "ID del rol es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el rol existe
    const rolExistente = await prisma.rol.findUnique({
      where: { id },
    })

    if (!rolExistente) {
      return NextResponse.json(
        { error: "Rol no encontrado" },
        { status: 404 }
      )
    }

    // No permitir eliminar roles del sistema
    if (rolExistente.esSistema) {
      return NextResponse.json(
        { error: "No se pueden eliminar roles del sistema" },
        { status: 400 }
      )
    }

    // Verificar que no haya usuarios con este rol
    const usuariosConRol = await prisma.usuario.count({
      where: { rolId: id }
    })

    if (usuariosConRol > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el rol. Hay ${usuariosConRol} usuario(s) asignados a este rol.` },
        { status: 400 }
      )
    }

    // Eliminar el rol (los permisos se eliminan en cascada)
    await prisma.rol.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "Rol eliminado correctamente",
    })
  } catch (error) {
    console.error("Error al eliminar rol:", error)
    return NextResponse.json(
      { error: "Error al eliminar rol" },
      { status: 500 }
    )
  }
}
