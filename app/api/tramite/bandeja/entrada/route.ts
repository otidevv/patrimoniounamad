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

// GET: Obtener documentos recibidos en la dependencia del usuario
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

    // Obtener documentos donde la dependencia del usuario es destinatario
    const documentos = await prisma.documentoTramite.findMany({
      where: {
        destinos: {
          some: {
            dependenciaDestinoId: usuario.dependenciaId,
          },
        },
        estado: {
          not: "BORRADOR",
        },
      },
      include: {
        tipoDocumento: {
          select: {
            codigo: true,
            nombre: true,
          },
        },
        dependenciaOrigen: {
          select: {
            siglas: true,
            nombre: true,
          },
        },
        remitente: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
        destinos: {
          where: {
            dependenciaDestinoId: usuario.dependenciaId,
          },
          select: {
            id: true,
            esCopia: true,
            estadoRecepcion: true,
            fechaRecepcion: true,
          },
        },
      },
      orderBy: [
        { prioridad: "desc" },
        { fechaDocumento: "desc" },
      ],
    })

    return NextResponse.json(documentos)
  } catch (error) {
    console.error("Error al obtener bandeja de entrada:", error)
    return NextResponse.json(
      { message: "Error al obtener los documentos" },
      { status: 500 }
    )
  }
}
