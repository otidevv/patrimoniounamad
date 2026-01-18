import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  buscarBienPorCodigo,
  buscarBienesPorDescripcion,
  verificarConexion,
} from "@/lib/siga"

// GET: Buscar bien por código patrimonial o descripción
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get("codigo")
    const descripcion = searchParams.get("descripcion")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Verificar conexión primero
    const conexionOk = await verificarConexion()
    if (!conexionOk) {
      return NextResponse.json(
        { error: "No se pudo conectar al servidor SIGA" },
        { status: 503 }
      )
    }

    // Búsqueda por código patrimonial (exacta)
    if (codigo) {
      const bien = await buscarBienPorCodigo(codigo.trim())

      if (!bien) {
        return NextResponse.json(
          { error: "Bien no encontrado", codigo },
          { status: 404 }
        )
      }

      return NextResponse.json({ bien })
    }

    // Búsqueda por descripción (parcial)
    if (descripcion) {
      const bienes = await buscarBienesPorDescripcion(descripcion.trim(), limit)

      return NextResponse.json({
        bienes,
        total: bienes.length,
      })
    }

    return NextResponse.json(
      { error: "Debe proporcionar código patrimonial o descripción" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error en búsqueda de bien:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
