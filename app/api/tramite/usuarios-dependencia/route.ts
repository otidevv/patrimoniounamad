import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

// GET: Obtener usuarios de una dependencia específica
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dependenciaId = searchParams.get("dependenciaId")

    if (!dependenciaId) {
      return NextResponse.json(
        { error: "dependenciaId es requerido" },
        { status: 400 }
      )
    }

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
      },
      orderBy: [
        { apellidos: "asc" },
        { nombre: "asc" },
      ],
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error("Error al obtener usuarios de dependencia:", error)
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    )
  }
}
