import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string
}

interface Params {
  params: Promise<{ dependenciaId: string }>
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

// GET: Obtener usuarios activos de una dependencia
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { dependenciaId } = await params

    const usuarios = await prisma.usuario.findMany({
      where: {
        dependenciaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        cargo: true,
        email: true,
      },
      orderBy: [
        { cargo: "asc" },
        { apellidos: "asc" },
      ],
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json(
      { message: "Error al obtener usuarios" },
      { status: 500 }
    )
  }
}
