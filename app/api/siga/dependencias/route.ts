import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { listarDependenciasSiga } from "@/lib/siga"

// GET: Listar dependencias SIGA (centros de costo)
export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const dependencias = await listarDependenciasSiga()

    console.log(`[SIGA Dependencias] Se encontraron ${dependencias.length} dependencias`)

    return NextResponse.json({ dependencias })
  } catch (error) {
    console.error("Error al listar dependencias SIGA:", error)
    return NextResponse.json(
      { error: "Error al consultar dependencias en SIGA" },
      { status: 500 }
    )
  }
}
