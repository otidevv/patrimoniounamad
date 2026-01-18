import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Obtener todos los tipos de documento de trámite
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get("activo") !== "false"

    const tipos = await prisma.tipoDocumentoTramite.findMany({
      where: soloActivos ? { activo: true } : undefined,
      orderBy: { nombre: "asc" },
      include: {
        _count: {
          select: {
            documentos: true,
          },
        },
      },
    })

    return NextResponse.json(tipos)
  } catch (error) {
    console.error("Error al obtener tipos de documento:", error)
    return NextResponse.json(
      { message: "Error al obtener los tipos de documento" },
      { status: 500 }
    )
  }
}

// POST: Crear nuevo tipo de documento
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { codigo, nombre, descripcion, requiereFirma, prefijo } = body

    if (!codigo || !nombre) {
      return NextResponse.json(
        { message: "El código y nombre son requeridos" },
        { status: 400 }
      )
    }

    const existente = await prisma.tipoDocumentoTramite.findUnique({
      where: { codigo },
    })

    if (existente) {
      return NextResponse.json(
        { message: "Ya existe un tipo de documento con ese código" },
        { status: 400 }
      )
    }

    const tipo = await prisma.tipoDocumentoTramite.create({
      data: {
        codigo,
        nombre,
        descripcion,
        requiereFirma: requiereFirma ?? true,
        prefijo,
      },
    })

    return NextResponse.json(tipo, { status: 201 })
  } catch (error) {
    console.error("Error al crear tipo de documento:", error)
    return NextResponse.json(
      { message: "Error al crear el tipo de documento" },
      { status: 500 }
    )
  }
}
