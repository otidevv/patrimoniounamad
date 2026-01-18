import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
      prisma.sesionInventario.count(),
      // Sesiones en proceso
      prisma.sesionInventario.count({
        where: { estado: "EN_PROCESO" },
      }),
      // Sesiones pendientes
      prisma.sesionInventario.count({
        where: { estado: "PENDIENTE" },
      }),
      // Sesiones finalizadas
      prisma.sesionInventario.count({
        where: { estado: "FINALIZADO" },
      }),
      // Total de verificaciones
      prisma.verificacionBien.count(),
      // Verificaciones encontradas
      prisma.verificacionBien.count({
        where: { resultado: "ENCONTRADO" },
      }),
      // Verificaciones no encontradas
      prisma.verificacionBien.count({
        where: { resultado: "NO_ENCONTRADO" },
      }),
      // Verificaciones reubicadas
      prisma.verificacionBien.count({
        where: { resultado: "REUBICADO" },
      }),
      // Verificaciones sobrantes
      prisma.verificacionBien.count({
        where: { resultado: "SOBRANTE" },
      }),
      // Total de dependencias
      prisma.dependencia.count(),
      // Sesiones recientes (últimas 5)
      prisma.sesionInventario.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          creador: {
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
        creador: s.creador ? `${s.creador.nombre} ${s.creador.apellidos}` : "N/A",
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
