import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string
}

async function verifyAuth(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    return decoded
  } catch {
    return null
  }
}

// GET - Obtener estructura de carpetas y archivos para el selector
export async function GET(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const busqueda = searchParams.get("q")

    // Obtener todas las carpetas del usuario (para el árbol)
    const carpetas = await prisma.carpetaRepositorio.findMany({
      where: {
        usuarioId: user.id,
      },
      select: {
        id: true,
        nombre: true,
        color: true,
        parentId: true,
        _count: {
          select: {
            archivos: true,
            hijos: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    })

    // Construir filtro para archivos
    const archivoWhere: any = {
      usuarioId: user.id,
    }

    if (busqueda) {
      archivoWhere.OR = [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { nombreArchivo: { contains: busqueda, mode: "insensitive" } },
      ]
    }

    // Obtener archivos del usuario
    const archivos = await prisma.archivoRepositorio.findMany({
      where: archivoWhere,
      select: {
        id: true,
        nombre: true,
        nombreArchivo: true,
        url: true,
        tamanio: true,
        firmado: true,
        fechaFirma: true,
        carpetaId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Construir árbol de carpetas
    const carpetasArbol = construirArbol(carpetas)

    // Agrupar archivos por carpeta
    const archivosPorCarpeta: Record<string, typeof archivos> = {
      raiz: [],
    }

    for (const archivo of archivos) {
      const key = archivo.carpetaId || "raiz"
      if (!archivosPorCarpeta[key]) {
        archivosPorCarpeta[key] = []
      }
      archivosPorCarpeta[key].push(archivo)
    }

    return NextResponse.json({
      carpetas: carpetasArbol,
      carpetasPlanas: carpetas,
      archivos,
      archivosPorCarpeta,
      totalArchivos: archivos.length,
    })
  } catch (error) {
    console.error("Error al obtener selector:", error)
    return NextResponse.json(
      { error: "Error al obtener datos del repositorio" },
      { status: 500 }
    )
  }
}

// Construir árbol de carpetas
interface CarpetaNodo {
  id: string
  nombre: string
  color: string | null
  parentId: string | null
  _count: {
    archivos: number
    hijos: number
  }
  children?: CarpetaNodo[]
}

function construirArbol(carpetas: CarpetaNodo[]): CarpetaNodo[] {
  const mapa = new Map<string, CarpetaNodo>()
  const raices: CarpetaNodo[] = []

  // Crear mapa de carpetas
  for (const carpeta of carpetas) {
    mapa.set(carpeta.id, { ...carpeta, children: [] })
  }

  // Construir árbol
  for (const carpeta of carpetas) {
    const nodo = mapa.get(carpeta.id)!
    if (carpeta.parentId && mapa.has(carpeta.parentId)) {
      const padre = mapa.get(carpeta.parentId)!
      padre.children = padre.children || []
      padre.children.push(nodo)
    } else {
      raices.push(nodo)
    }
  }

  return raices
}
