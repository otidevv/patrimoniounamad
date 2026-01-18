import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { prisma } from "@/lib/prisma"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string
  dependenciaId?: string
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

// GET: Obtener documentos enviados desde la dependencia del usuario
export async function GET() {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener la dependencia del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { dependenciaId: true },
    })

    if (!usuario?.dependenciaId) {
      return NextResponse.json([])
    }

    // Obtener documentos creados por la dependencia del usuario
    const documentos = await prisma.documentoTramite.findMany({
      where: {
        dependenciaOrigenId: usuario.dependenciaId,
      },
      include: {
        tipoDocumento: {
          select: {
            codigo: true,
            nombre: true,
          },
        },
        destinos: {
          include: {
            dependenciaDestino: {
              select: {
                siglas: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(documentos)
  } catch (error) {
    console.error("Error al obtener bandeja de salida:", error)
    return NextResponse.json(
      { message: "Error al obtener los documentos" },
      { status: 500 }
    )
  }
}
