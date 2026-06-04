import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  excluirSesionesSistema,
  excluirVerificacionesSistema,
} from "@/lib/inventario-sistema"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Obtener estadísticas de sesiones de inventario
    const [
      totalSesiones,
      sesionesEnProceso,
      sesionesPendientes,
      sesionesFinalizadas,
      totalVerificaciones,
      verificacionesEncontradas,
      verificacionesNoEncontradas,
      verificacionesReubicadas,
      verificacionesSobrantes,
      totalDependencias,
      sesionesRecientes,
    ] = await Promise.all([
      // Total de sesiones
      prisma.sesionInventario.count({ where: excluirSesionesSistema }),
      // Sesiones en proceso
      prisma.sesionInventario.count({
        where: { estado: "EN_PROCESO", ...excluirSesionesSistema },
      }),
      // Sesiones programadas (pendientes de iniciar)
      prisma.sesionInventario.count({
        where: { estado: "PROGRAMADA", ...excluirSesionesSistema },
      }),
      // Sesiones finalizadas
      prisma.sesionInventario.count({
        where: { estado: "FINALIZADA", ...excluirSesionesSistema },
      }),
      // Total de verificaciones
      prisma.verificacionBien.count({ where: excluirVerificacionesSistema }),
      // Verificaciones encontradas
      prisma.verificacionBien.count({
        where: { resultado: "ENCONTRADO", ...excluirVerificacionesSistema },
      }),
      // Verificaciones no encontradas
      prisma.verificacionBien.count({
        where: { resultado: "NO_ENCONTRADO", ...excluirVerificacionesSistema },
      }),
      // Verificaciones reubicadas
      prisma.verificacionBien.count({
        where: { resultado: "REUBICADO", ...excluirVerificacionesSistema },
      }),
      // Verificaciones sobrantes
      prisma.verificacionBien.count({
        where: { resultado: "SOBRANTE", ...excluirVerificacionesSistema },
      }),
      // Total de dependencias
      prisma.dependencia.count(),
      // Sesiones recientes (últimas 5)
      prisma.sesionInventario.findMany({
        take: 5,
        where: excluirSesionesSistema,
        orderBy: { createdAt: "desc" },
        include: {
          responsable: {
            select: { nombre: true, apellidos: true },
          },
          dependencia: {
            select: { nombre: true },
          },
          _count: {
            select: { verificaciones: true },
          },
        },
      }),
    ])

    // Calcular porcentaje de avance general
    const porcentajeVerificado = totalVerificaciones > 0
      ? Math.round((verificacionesEncontradas / totalVerificaciones) * 100)
      : 0

    // Obtener resumen por dependencia (top 8 con más verificaciones)
    const dependenciasConVerificaciones = await prisma.dependencia.findMany({
      select: {
        id: true,
        nombre: true,
        _count: {
          select: { sesionesInventario: true },
        },
      },
      orderBy: {
        sesionesInventario: {
          _count: "desc",
        },
      },
      take: 8,
    })

    return NextResponse.json({
      estadisticas: {
        totalSesiones,
        sesionesEnProceso,
        sesionesPendientes,
        sesionesFinalizadas,
        totalVerificaciones,
        verificacionesEncontradas,
        verificacionesNoEncontradas,
        verificacionesReubicadas,
        verificacionesSobrantes,
        totalDependencias,
        porcentajeVerificado,
      },
      sesionesRecientes: sesionesRecientes.map((s) => ({
        id: s.id,
        codigo: s.codigo,
        nombre: s.nombre,
        estado: s.estado,
        totalVerificados: s._count.verificaciones,
        responsable: s.responsable ? `${s.responsable.nombre} ${s.responsable.apellidos}` : "N/A",
        dependencia: s.dependencia?.nombre || "Sin dependencia",
        fecha: s.createdAt,
      })),
      dependenciasResumen: dependenciasConVerificaciones.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        sesiones: d._count.sesionesInventario,
      })),
    })
  } catch (error) {
    console.error("Error al obtener estadísticas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
