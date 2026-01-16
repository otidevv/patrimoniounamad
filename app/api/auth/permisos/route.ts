import { NextResponse } from "next/server"
import { cookies } from "next/headers"
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

type PermisosMap = Record<string, {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}>

// GET - Obtener permisos del usuario actual
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
    const rolCodigo = decoded.rol
    let rolId = decoded.rolId

    // Si no hay rolId en el token (tokens antiguos), buscar por código
    if (!rolId) {
      const rol = await prisma.rol.findUnique({
        where: { codigo: rolCodigo }
      })
      if (rol) {
        rolId = rol.id
      }
    }

    // Admin siempre tiene todos los permisos
    if (rolCodigo === "ADMIN") {
      const modulos = Object.values(Modulo)
      const permisosMap: PermisosMap = {}

      for (const modulo of modulos) {
        permisosMap[modulo] = {
          ver: true,
          crear: true,
          editar: true,
          eliminar: true,
          reportes: true
        }
      }

      return NextResponse.json({ permisos: permisosMap })
    }

    // Obtener permisos de la base de datos usando rolId
    const permisos = await prisma.permisoRol.findMany({
      where: { rolId }
    })

    // Convertir a mapa
    const permisosMap: PermisosMap = {}
    const modulos = Object.values(Modulo)

    // Inicializar todos los módulos con permisos vacíos
    for (const modulo of modulos) {
      permisosMap[modulo] = {
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
        reportes: false
      }
    }

    // Sobrescribir con permisos de la base de datos
    for (const permiso of permisos) {
      permisosMap[permiso.modulo] = {
        ver: permiso.ver,
        crear: permiso.crear,
        editar: permiso.editar,
        eliminar: permiso.eliminar,
        reportes: permiso.reportes
      }
    }

    return NextResponse.json({ permisos: permisosMap })
  } catch (error) {
    console.error("Error al obtener permisos:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    )
  }
}
