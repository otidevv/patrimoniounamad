import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Modulo } from "@prisma/client"
import { getSession } from "@/lib/auth"

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
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const rolCodigo = session.rol
    let rolId = session.rolId

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
