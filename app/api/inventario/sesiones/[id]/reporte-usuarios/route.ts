import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  obtenerResumenPorUsuarioFinal,
  obtenerCodigosPorDependencia,
  buscarBienesPorEmpleadoFinal,
} from "@/lib/siga"

// GET: Reporte de verificación agrupado por usuario final
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
    const { searchParams } = new URL(request.url)
    const empleadoFinal = searchParams.get("empleadoFinal")

    // Obtener la sesión
    const sesion = await prisma.sesionInventario.findUnique({
      where: { id },
      select: {
        id: true,
        sigaCentroCosto: true,
      },
    })

    if (!sesion) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      )
    }

    if (!sesion.sigaCentroCosto) {
      return NextResponse.json(
        { error: "Esta sesión no tiene dependencia SIGA asociada" },
        { status: 400 }
      )
    }

    // Si se pide detalle de un usuario final específico (por código EMPLEADO_FINAL)
    if (empleadoFinal) {
      // Consultar SIGA directamente filtrando por EMPLEADO_FINAL
      const bienesUsuario = await buscarBienesPorEmpleadoFinal(
        sesion.sigaCentroCosto,
        empleadoFinal
      )

      // Obtener verificaciones de esta sesión
      const codigosPatrimoniales = bienesUsuario.map((b) => b.codigo_patrimonial)
      const verificaciones = await prisma.verificacionBien.findMany({
        where: {
          sesionId: id,
          codigoPatrimonial: { in: codigosPatrimoniales },
        },
        select: {
          codigoPatrimonial: true,
          resultado: true,
        },
      })

      const verificacionMap = new Map(
        verificaciones.map((v) => [v.codigoPatrimonial, v.resultado])
      )

      const bienesConEstado = bienesUsuario.map((bien) => ({
        ...bien,
        verificado: verificacionMap.has(bien.codigo_patrimonial),
        resultado_verificacion: verificacionMap.get(bien.codigo_patrimonial) || null,
      }))

      return NextResponse.json({ bienes: bienesConEstado })
    }

    // Resumen general por usuario final
    // 1. Obtener totales por usuario desde SIGA (1 query con GROUP BY)
    const resumen = await obtenerResumenPorUsuarioFinal(sesion.sigaCentroCosto)

    // 2. Obtener lista ligera de códigos + empleado_final (1 query, solo 2 columnas)
    const codigosEmpleados = await obtenerCodigosPorDependencia(sesion.sigaCentroCosto)

    // 3. Obtener verificaciones de esta sesión (1 query a PostgreSQL)
    const verificaciones = await prisma.verificacionBien.findMany({
      where: { sesionId: id },
      select: {
        codigoPatrimonial: true,
      },
    })

    const codigosVerificados = new Set(
      verificaciones.map((v) => v.codigoPatrimonial)
    )

    // 4. Agrupar códigos por empleado_final para cruzar
    const codigosPorEmpleado = new Map<string, string[]>()
    for (const item of codigosEmpleados) {
      const lista = codigosPorEmpleado.get(item.empleado_final) || []
      lista.push(item.codigo_patrimonial)
      codigosPorEmpleado.set(item.empleado_final, lista)
    }

    // 5. Calcular verificados por usuario
    const resumenConVerificacion = resumen.map((usuario) => {
      const codigosDelUsuario = codigosPorEmpleado.get(usuario.empleado_final) || []
      const verificadosDelUsuario = codigosDelUsuario.filter((c) =>
        codigosVerificados.has(c)
      ).length

      return {
        ...usuario,
        total_verificados: verificadosDelUsuario,
        porcentaje:
          usuario.total_bienes > 0
            ? Math.round((verificadosDelUsuario / usuario.total_bienes) * 100)
            : 0,
      }
    })

    return NextResponse.json({ resumen: resumenConVerificacion })
  } catch (error) {
    console.error("Error al generar reporte por usuario:", error)
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    )
  }
}
