import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Obtener todas las sedes
export async function GET() {
  try {
    const sedes = await prisma.sede.findMany({
      include: {
        _count: {
          select: { dependencias: true },
        },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(sedes)
  } catch (error) {
    console.error("Error al obtener sedes:", error)
    return NextResponse.json(
      { message: "Error al obtener las sedes" },
      { status: 500 }
    )
  }
}

// POST: Crear nueva sede
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { codigo, nombre, direccion, ciudad, telefono, email } = body

    // Validar campos requeridos
    if (!codigo || !nombre) {
      return NextResponse.json(
        { message: "El código y nombre son requeridos" },
        { status: 400 }
      )
    }

    // Verificar si el código ya existe
    const existente = await prisma.sede.findUnique({
      where: { codigo },
    })

    if (existente) {
      return NextResponse.json(
        { message: "Ya existe una sede con ese código" },
        { status: 400 }
      )
    }

    const sede = await prisma.sede.create({
      data: {
        codigo,
        nombre,
        direccion: direccion || null,
        ciudad: ciudad || null,
        telefono: telefono || null,
        email: email || null,
      },
    })

    return NextResponse.json(sede, { status: 201 })
  } catch (error) {
    console.error("Error al crear sede:", error)
    return NextResponse.json(
      { message: "Error al crear la sede" },
      { status: 500 }
    )
  }
}
