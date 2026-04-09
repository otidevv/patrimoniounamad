import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

// GET: Obtener documentos enviados desde la dependencia del usuario
export async function GET() {
  try {
    const user = await getSession()
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
