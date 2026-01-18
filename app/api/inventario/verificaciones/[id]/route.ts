import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Obtener verificación por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params

    const verificacion = await prisma.verificacionBien.findUnique({
      where: { id },
      include: {
        sesion: {
          select: { id: true, codigo: true, nombre: true, estado: true },
        },
        verificador: {
          select: { id: true, nombre: true, apellidos: true },
        },
      },
    })

    if (!verificacion) {
      return NextResponse.json(
        { error: "Verificación no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(verificacion)
  } catch (error) {
    console.error("Error al obtener verificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT: Actualizar verificación
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Obtener verificación actual
    const verificacionActual = await prisma.verificacionBien.findUnique({
      where: { id },
      include: {
        sesion: { select: { estado: true } },
      },
    })

    if (!verificacionActual) {
      return NextResponse.json(
        { error: "Verificación no encontrada" },
        { status: 404 }
      )
    }

    // Solo se puede editar si la sesión está en proceso
    if (verificacionActual.sesion.estado !== "EN_PROCESO") {
      return NextResponse.json(
        { error: "Solo se pueden editar verificaciones de sesiones en proceso" },
        { status: 400 }
      )
    }

    const {
      resultado,
      estadoFisico,
      ubicacionReal,
      responsableReal,
      observaciones,
      fotoUrl,
    } = body

    const verificacionActualizada = await prisma.verificacionBien.update({
      where: { id },
      data: {
        resultado: resultado || undefined,
        estadoFisico: estadoFisico || undefined,
        ubicacionReal: ubicacionReal,
        responsableReal: responsableReal,
        observaciones: observaciones,
        fotoUrl: fotoUrl,
      },
      include: {
        verificador: {
          select: { id: true, nombre: true, apellidos: true },
        },
      },
    })

    // Actualizar estadísticas de la sesión
    const sesionId = verificacionActualizada.sesionId
    const stats = await prisma.verificacionBien.groupBy({
      by: ["resultado"],
      where: { sesionId },
      _count: true,
    })

    const statsMap: Record<string, number> = {}
    stats.forEach((s) => {
      statsMap[s.resultado] = s._count
    })

    await prisma.sesionInventario.update({
      where: { id: sesionId },
      data: {
        totalVerificados: Object.values(statsMap).reduce((a, b) => a + b, 0),
        totalEncontrados: statsMap["ENCONTRADO"] || 0,
        totalReubicados: statsMap["REUBICADO"] || 0,
        totalNoEncontrados: statsMap["NO_ENCONTRADO"] || 0,
        totalSobrantes: statsMap["SOBRANTE"] || 0,
      },
    })

    return NextResponse.json(verificacionActualizada)
  } catch (error) {
    console.error("Error al actualizar verificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar verificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Obtener verificación
    const verificacion = await prisma.verificacionBien.findUnique({
      where: { id },
      include: {
        sesion: { select: { id: true, estado: true } },
      },
    })

    if (!verificacion) {
      return NextResponse.json(
        { error: "Verificación no encontrada" },
        { status: 404 }
      )
    }

    // Solo se puede eliminar si la sesión está en proceso
    if (verificacion.sesion.estado !== "EN_PROCESO") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar verificaciones de sesiones en proceso" },
        { status: 400 }
      )
    }

    await prisma.verificacionBien.delete({ where: { id } })

    // Actualizar estadísticas de la sesión
    const sesionId = verificacion.sesion.id
    const stats = await prisma.verificacionBien.groupBy({
      by: ["resultado"],
      where: { sesionId },
      _count: true,
    })

    const statsMap: Record<string, number> = {}
    stats.forEach((s) => {
      statsMap[s.resultado] = s._count
    })

    await prisma.sesionInventario.update({
      where: { id: sesionId },
      data: {
        totalVerificados: Object.values(statsMap).reduce((a, b) => a + b, 0),
        totalEncontrados: statsMap["ENCONTRADO"] || 0,
        totalReubicados: statsMap["REUBICADO"] || 0,
        totalNoEncontrados: statsMap["NO_ENCONTRADO"] || 0,
        totalSobrantes: statsMap["SOBRANTE"] || 0,
      },
    })

    return NextResponse.json({ message: "Verificación eliminada correctamente" })
  } catch (error) {
    console.error("Error al eliminar verificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
