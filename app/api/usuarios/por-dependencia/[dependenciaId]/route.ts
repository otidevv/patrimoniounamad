import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface Params {
  params: Promise<{ dependenciaId: string }>
}

// GET: Obtener usuarios activos de una dependencia
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getSession()
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
