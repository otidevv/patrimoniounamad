import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

// GET: Obtener documentos recibidos en la dependencia del usuario
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
