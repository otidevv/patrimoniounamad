import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TipoDocumento } from "@prisma/client"

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { nombre, apellidos, tipoDocumento, numeroDocumento, cargo, telefono } = body

    if (!nombre?.trim() || !apellidos?.trim()) {
      return NextResponse.json(
        { error: "Nombre y apellidos son requeridos" },
        { status: 400 }
      )
    }

    if (!numeroDocumento?.trim()) {
      return NextResponse.json(
        { error: "El número de documento es requerido" },
        { status: 400 }
      )
    }

    // Validar tipo de documento
    const tiposValidos: string[] = Object.values(TipoDocumento)
    const tipoDoc = tiposValidos.includes(tipoDocumento) ? tipoDocumento : "DNI"

    const user = await prisma.usuario.update({
      where: { id: session.id },
      data: {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        tipoDocumento: tipoDoc,
        numeroDocumento: numeroDocumento.trim(),
        cargo: cargo?.trim() || null,
        telefono: telefono?.trim() || null,
      },
    })

    return NextResponse.json({
      message: "Perfil completado correctamente",
      user: { id: user.id, email: user.email },
    })
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar perfil" },
      { status: 500 }
    )
  }
}
