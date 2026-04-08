import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Listar participantes de una sesión
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const participantes = await prisma.participanteInventario.findMany({
      where: { sesionId: id, activo: true },
      include: {
        usuario: {
          select: { id: true, nombre: true, apellidos: true, cargo: true, numeroDocumento: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ participantes })
  } catch (error) {
    console.error("Error al listar participantes:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST: Agregar participante a la sesión
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { usuarioId, rol } = body

    if (!usuarioId) {
      return NextResponse.json({ error: "Se requiere el ID del usuario" }, { status: 400 })
    }

    // Verificar que no esté duplicado
    const existente = await prisma.participanteInventario.findUnique({
      where: { sesionId_usuarioId: { sesionId: id, usuarioId } },
    })

    if (existente) {
      if (!existente.activo) {
        // Reactivar
        const updated = await prisma.participanteInventario.update({
          where: { id: existente.id },
          data: { activo: true, rol: rol || "VERIFICADOR" },
          include: { usuario: { select: { id: true, nombre: true, apellidos: true, cargo: true, numeroDocumento: true } } },
        })
        return NextResponse.json({ participante: updated })
      }
      return NextResponse.json({ error: "Este usuario ya es participante" }, { status: 409 })
    }

    const participante = await prisma.participanteInventario.create({
      data: {
        sesionId: id,
        usuarioId,
        rol: rol || "VERIFICADOR",
      },
      include: {
        usuario: { select: { id: true, nombre: true, apellidos: true, cargo: true, numeroDocumento: true } },
      },
    })

    return NextResponse.json({ participante }, { status: 201 })
  } catch (error) {
    console.error("Error al agregar participante:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// DELETE: Quitar participante (desactivar)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const participanteId = searchParams.get("participanteId")

    if (!participanteId) {
      return NextResponse.json({ error: "Se requiere participanteId" }, { status: 400 })
    }

    await prisma.participanteInventario.update({
      where: { id: participanteId },
      data: { activo: false },
    })

    return NextResponse.json({ message: "Participante removido" })
  } catch (error) {
    console.error("Error al remover participante:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
