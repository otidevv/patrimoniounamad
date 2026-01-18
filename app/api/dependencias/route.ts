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

// GET - Listar dependencias
export async function GET() {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const dependencias = await prisma.dependencia.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        siglas: true,
        tipo: true,
        sede: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(dependencias)
  } catch (error) {
    console.error("Error al listar dependencias:", error)
    return NextResponse.json(
      { error: "Error al listar dependencias" },
      { status: 500 }
    )
  }
}
