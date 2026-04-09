import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

// GET: Obtener documentos creados por el usuario actual
export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const documentos = await prisma.documentoTramite.findMany({
      where: {
        remitenteId: user.id,
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
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(documentos)
  } catch (error) {
    console.error("Error al obtener mis documentos:", error)
    return NextResponse.json(
      { message: "Error al obtener los documentos" },
      { status: 500 }
    )
  }
}
