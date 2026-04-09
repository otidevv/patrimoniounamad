import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Listar dependencias
export async function GET() {
  try {
    const user = await getSession()
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
