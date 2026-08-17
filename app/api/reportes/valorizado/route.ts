import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { obtenerResumenValorizado, verificarConexion } from "@/lib/siga"

// GET: Resumen del inventario valorizado (SIGA), agrupado por dependencia o sede
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agrupar = searchParams.get("agrupar") === "sede" ? "sede" : "dependencia"

    const conexionOk = await verificarConexion()
    if (!conexionOk) {
      return NextResponse.json(
        { error: "No se pudo conectar al servidor SIGA" },
        { status: 503 }
      )
    }

    const grupos = await obtenerResumenValorizado(agrupar)

    const totales = grupos.reduce(
      (acc, g) => ({
        total_bienes: acc.total_bienes + g.total_bienes,
        valor_compra: acc.valor_compra + g.valor_compra,
        valor_inicial: acc.valor_inicial + g.valor_inicial,
        depreciacion: acc.depreciacion + g.depreciacion,
        valor_neto: acc.valor_neto + g.valor_neto,
      }),
      {
        total_bienes: 0,
        valor_compra: 0,
        valor_inicial: 0,
        depreciacion: 0,
        valor_neto: 0,
      }
    )

    return NextResponse.json({ agrupacion: agrupar, grupos, totales })
  } catch (error) {
    console.error("Error en reporte valorizado:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
