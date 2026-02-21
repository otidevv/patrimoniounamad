import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  obtenerResumenPorUsuarioFinal,
  buscarBienesPorDependenciaPaginado,
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

    // Si se pide detalle de un usuario final específico
    if (empleadoFinal) {
      // Obtener todos los bienes de esa dependencia (sin paginación para cruzar)
      const { bienes } = await buscarBienesPorDependenciaPaginado(
        sesion.sigaCentroCosto,
        1,
        1000
      )

      // Filtrar por usuario final (EMPLEADO_FINAL)
      const bienesUsuario = bienes.filter(
        (b) => b.usuario === empleadoFinal
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
    const resumen = await obtenerResumenPorUsuarioFinal(sesion.sigaCentroCosto)

    // Obtener todas las verificaciones de esta sesión para calcular porcentajes
    const verificaciones = await prisma.verificacionBien.findMany({
      where: { sesionId: id },
      select: {
        codigoPatrimonial: true,
        resultado: true,
      },
    })

    const codigosVerificados = new Set(
      verificaciones.map((v) => v.codigoPatrimonial)
    )

    // Para cada usuario, obtener sus bienes y contar verificados
    // Usamos los bienes completos para cruzar por usuario
    const { bienes: todosLosBienes } = await buscarBienesPorDependenciaPaginado(
      sesion.sigaCentroCosto,
      1,
      5000
    )

    const resumenConVerificacion = resumen.map((usuario) => {
      const bienesDelUsuario = todosLosBienes.filter(
        (b) => b.usuario === usuario.usuario_nombre
      )
      const verificadosDelUsuario = bienesDelUsuario.filter((b) =>
        codigosVerificados.has(b.codigo_patrimonial)
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
