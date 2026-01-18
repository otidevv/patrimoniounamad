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

// GET - Listar archivos del usuario
export async function GET(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const carpetaId = searchParams.get("carpetaId")
    const soloFirmados = searchParams.get("firmados") === "true"
    const busqueda = searchParams.get("q")

    // Construir filtro
    const where: any = {
      usuarioId: user.id,
    }

    // Filtrar por carpeta (null para raíz)
    if (carpetaId === "raiz" || carpetaId === "null") {
      where.carpetaId = null
    } else if (carpetaId) {
      where.carpetaId = carpetaId
    }

    if (soloFirmados) {
      where.firmado = true
    }

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { nombreArchivo: { contains: busqueda, mode: "insensitive" } },
      ]
    }

    const archivos = await prisma.archivoRepositorio.findMany({
      where,
      include: {
        carpeta: {
          select: {
            id: true,
            nombre: true,
          },
        },
        _count: {
          select: {
            usosEnTramites: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(archivos)
  } catch (error) {
    console.error("Error al listar archivos:", error)
    return NextResponse.json(
      { error: "Error al listar archivos" },
      { status: 500 }
    )
  }
}
