import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { obtenerResumenSedeDependencia, verificarConexion } from "@/lib/siga"

interface DepResumen {
  dep_id: string
  dep_nombre: string
  total_bienes: number
  valor_neto: number
}

interface SedeResumen {
  sede_id: string
  sede_nombre: string
  total_bienes: number
  valor_neto: number
  dependencias: DepResumen[]
}

// GET: Resumen de bienes (SIGA) por sede, con desglose por dependencia
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const conexionOk = await verificarConexion()
    if (!conexionOk) {
      return NextResponse.json(
        { error: "No se pudo conectar al servidor SIGA" },
        { status: 503 }
      )
    }

    const filas = await obtenerResumenSedeDependencia()

    // Anidar dependencias dentro de cada sede
    const sedesMap = new Map<string, SedeResumen>()
    for (const f of filas) {
      let sede = sedesMap.get(f.sede_id)
      if (!sede) {
        sede = {
          sede_id: f.sede_id,
          sede_nombre: f.sede_nombre,
          total_bienes: 0,
          valor_neto: 0,
          dependencias: [],
        }
        sedesMap.set(f.sede_id, sede)
      }
      sede.dependencias.push({
        dep_id: f.dep_id,
        dep_nombre: f.dep_nombre,
        total_bienes: f.total_bienes,
        valor_neto: f.valor_neto,
      })
      sede.total_bienes += f.total_bienes
      sede.valor_neto += f.valor_neto
    }

    const sedes = Array.from(sedesMap.values()).sort(
      (a, b) => b.valor_neto - a.valor_neto
    )

    const totales = sedes.reduce(
      (acc, s) => ({
        total_bienes: acc.total_bienes + s.total_bienes,
        valor_neto: acc.valor_neto + s.valor_neto,
      }),
      { total_bienes: 0, valor_neto: 0 }
    )

    return NextResponse.json({ sedes, totales })
  } catch (error) {
    console.error("Error en reporte por sede:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
