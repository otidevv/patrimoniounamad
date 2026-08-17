import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { buscarBienesPorFechaAlta, verificarConexion } from "@/lib/siga"

// GET: Reporte de altas (incorporaciones) por rango de fecha de alta
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hoy = new Date()
    const finPorDefecto = hoy.toISOString().split("T")[0]
    const inicioPorDefecto = `${hoy.getFullYear()}-01-01`

    const desde = searchParams.get("desde") || inicioPorDefecto
    const hasta = searchParams.get("hasta") || finPorDefecto

    // Validación básica de formato YYYY-MM-DD
    const re = /^\d{4}-\d{2}-\d{2}$/
    if (!re.test(desde) || !re.test(hasta)) {
      return NextResponse.json(
        { error: "Fechas inválidas (formato esperado: AAAA-MM-DD)" },
        { status: 400 }
      )
    }

    const conexionOk = await verificarConexion()
    if (!conexionOk) {
      return NextResponse.json(
        { error: "No se pudo conectar al servidor SIGA" },
        { status: 503 }
      )
    }

    const bienes = await buscarBienesPorFechaAlta(desde, hasta, 5000)

    const valorCompraTotal = bienes.reduce(
      (acc, b) => acc + (b.valor_compra || 0),
      0
    )
    const valorNetoTotal = bienes.reduce(
      (acc, b) => acc + (b.valor_neto || 0),
      0
    )

    return NextResponse.json({
      desde,
      hasta,
      total: bienes.length,
      valorCompraTotal,
      valorNetoTotal,
      bienes,
    })
  } catch (error) {
    console.error("Error en reporte de altas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
