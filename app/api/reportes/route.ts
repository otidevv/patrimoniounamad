import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Obtener datos para reportes
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
    const tipo = searchParams.get("tipo") || "resumen"

    switch (tipo) {
      case "usuarios":
        return await getReporteUsuarios()
      case "sesiones":
        return await getReporteSesiones(searchParams)
      case "dependencias":
        return await getReporteDependencias()
      case "sedes":
        return await getReporteSedes()
      case "verificaciones":
        return await getReporteVerificaciones(searchParams)
      case "resumen":
      default:
        return await getReporteResumen()
    }
  } catch (error) {
    console.error("Error al generar reporte:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// Reporte de Usuarios
async function getReporteUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      email: true,
      tipoDocumento: true,
      numeroDocumento: true,
      cargo: true,
      telefono: true,
      activo: true,
      fechaInicio: true,
      fechaFin: true,
      createdAt: true,
      rol: {
        select: { nombre: true },
      },
      sede: {
        select: { nombre: true },
      },
      dependencia: {
        select: { nombre: true, siglas: true },
      },
      _count: {
        select: {
          sesionesResponsable: true,
          verificacionesRealizadas: true,
          participacionesInventario: true,
        },
      },
    },
    orderBy: { apellidos: "asc" },
  })

  const data = usuarios.map((u) => ({
    ID: u.id,
    Nombres: u.nombre,
    Apellidos: u.apellidos,
    "Nombre Completo": `${u.apellidos}, ${u.nombre}`,
    Email: u.email,
    "Tipo Doc.": u.tipoDocumento,
    "Nro. Documento": u.numeroDocumento || "",
    Cargo: u.cargo || "",
    Teléfono: u.telefono || "",
    Sede: u.sede?.nombre || "",
    Dependencia: u.dependencia?.nombre || "",
    "Siglas Dep.": u.dependencia?.siglas || "",
    Rol: u.rol?.nombre || "",
    Estado: u.activo ? "Activo" : "Inactivo",
    "Fecha Inicio": u.fechaInicio?.toISOString().split("T")[0] || "",
    "Fecha Fin": u.fechaFin?.toISOString().split("T")[0] || "",
    "Sesiones Responsable": u._count.sesionesResponsable,
    "Participaciones Inventario": u._count.participacionesInventario,
    "Verificaciones Realizadas": u._count.verificacionesRealizadas,
    "Fecha Registro": u.createdAt.toISOString().split("T")[0],
  }))

  return NextResponse.json({
    tipo: "usuarios",
    titulo: "Reporte de Usuarios del Sistema",
    total: data.length,
    columnas: [
      "ID", "Nombres", "Apellidos", "Nombre Completo", "Email", "Tipo Doc.", "Nro. Documento",
      "Cargo", "Teléfono", "Sede", "Dependencia", "Siglas Dep.", "Rol", "Estado",
      "Fecha Inicio", "Fecha Fin", "Sesiones Responsable", "Participaciones Inventario",
      "Verificaciones Realizadas", "Fecha Registro"
    ],
    datos: data,
  })
}

// Reporte de Sesiones
async function getReporteSesiones(searchParams: URLSearchParams) {
  const estado = searchParams.get("estado")
  const dependenciaId = searchParams.get("dependenciaId")
  const fechaInicio = searchParams.get("fechaInicio")
  const fechaFin = searchParams.get("fechaFin")

  const where: Record<string, unknown> = {}
  if (estado && estado !== "all") where.estado = estado
  if (dependenciaId && dependenciaId !== "all") where.dependenciaId = dependenciaId
  if (fechaInicio || fechaFin) {
    where.fechaProgramada = {}
    if (fechaInicio) (where.fechaProgramada as Record<string, unknown>).gte = new Date(fechaInicio)
    if (fechaFin) (where.fechaProgramada as Record<string, unknown>).lte = new Date(fechaFin)
  }

  const sesiones = await prisma.sesionInventario.findMany({
    where,
    include: {
      dependencia: { select: { nombre: true, siglas: true } },
      sede: { select: { nombre: true } },
      responsable: { select: { nombre: true, apellidos: true } },
      _count: { select: { verificaciones: true, participantes: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data = sesiones.map((s) => ({
    Código: s.codigo,
    Nombre: s.nombre,
    Descripción: s.descripcion || "",
    Estado: s.estado,
    "Ubicación Física": s.ubicacionFisica || "",
    Dependencia: s.dependencia?.nombre || "",
    "Siglas Dep.": s.dependencia?.siglas || "",
    Sede: s.sede?.nombre || "",
    Responsable: s.responsable ? `${s.responsable.apellidos}, ${s.responsable.nombre}` : "",
    "Participantes": s._count.participantes,
    "Fecha Programada": s.fechaProgramada?.toISOString().split("T")[0] || "",
    "Fecha Inicio": s.fechaInicio?.toISOString().split("T")[0] || "",
    "Fecha Fin": s.fechaFin?.toISOString().split("T")[0] || "",
    "Total Bienes SIGA": s.totalBienesSiga,
    "Total Verificados": s.totalVerificados,
    "Encontrados": s.totalEncontrados,
    "No Encontrados": s.totalNoEncontrados,
    "Reubicados": s.totalReubicados,
    "Sobrantes": s.totalSobrantes,
    "% Avance": s.totalBienesSiga > 0
      ? ((s.totalVerificados / s.totalBienesSiga) * 100).toFixed(2) + "%"
      : "0%",
    "% Encontrados": s.totalVerificados > 0
      ? ((s.totalEncontrados / s.totalVerificados) * 100).toFixed(2) + "%"
      : "0%",
    Observaciones: s.observaciones || "",
    "Fecha Creación": s.createdAt.toISOString().split("T")[0],
  }))

  return NextResponse.json({
    tipo: "sesiones",
    titulo: "Reporte de Sesiones de Inventario",
    total: data.length,
    columnas: [
      "Código", "Nombre", "Descripción", "Estado", "Ubicación Física", "Dependencia", "Siglas Dep.",
      "Sede", "Responsable", "Participantes", "Fecha Programada", "Fecha Inicio", "Fecha Fin",
      "Total Bienes SIGA", "Total Verificados", "Encontrados", "No Encontrados",
      "Reubicados", "Sobrantes", "% Avance", "% Encontrados", "Observaciones", "Fecha Creación"
    ],
    datos: data,
  })
}

// Reporte de Dependencias
async function getReporteDependencias() {
  const dependencias = await prisma.dependencia.findMany({
    include: {
      sede: { select: { nombre: true } },
      parent: { select: { nombre: true, siglas: true } },
      _count: {
        select: {
          usuarios: true,
          sesionesInventario: true,
          hijos: true,
        },
      },
    },
    orderBy: { nombre: "asc" },
  })

  // Obtener estadísticas de verificaciones por dependencia
  const verificacionesPorDependencia = await prisma.sesionInventario.groupBy({
    by: ["dependenciaId"],
    _sum: {
      totalVerificados: true,
      totalEncontrados: true,
      totalNoEncontrados: true,
      totalReubicados: true,
      totalSobrantes: true,
    },
  })

  const statsMap = new Map(
    verificacionesPorDependencia.map((v) => [v.dependenciaId, v._sum])
  )

  const data = dependencias.map((d) => {
    const stats = statsMap.get(d.id)
    return {
      ID: d.id,
      Código: d.codigo || "",
      Nombre: d.nombre,
      Siglas: d.siglas || "",
      Tipo: d.tipo,
      Sede: d.sede?.nombre || "",
      "Dependencia Padre": d.parent?.nombre || "",
      "Subdependencias": d._count.hijos,
      "Usuarios Asignados": d._count.usuarios,
      "Sesiones Inventario": d._count.sesionesInventario,
      "Total Verificados": stats?.totalVerificados || 0,
      "Encontrados": stats?.totalEncontrados || 0,
      "No Encontrados": stats?.totalNoEncontrados || 0,
      "Reubicados": stats?.totalReubicados || 0,
      "Sobrantes": stats?.totalSobrantes || 0,
      Estado: d.activo ? "Activo" : "Inactivo",
      "Fecha Creación": d.createdAt.toISOString().split("T")[0],
    }
  })

  return NextResponse.json({
    tipo: "dependencias",
    titulo: "Reporte de Dependencias",
    total: data.length,
    columnas: [
      "ID", "Código", "Nombre", "Siglas", "Tipo", "Sede", "Dependencia Padre", "Subdependencias",
      "Usuarios Asignados", "Sesiones Inventario", "Total Verificados",
      "Encontrados", "No Encontrados", "Reubicados", "Sobrantes", "Estado", "Fecha Creación"
    ],
    datos: data,
  })
}

// Reporte de Sedes
async function getReporteSedes() {
  const sedes = await prisma.sede.findMany({
    include: {
      _count: {
        select: {
          dependencias: true,
          sesionesInventario: true,
          usuarios: true,
        },
      },
    },
    orderBy: { nombre: "asc" },
  })

  // Obtener estadísticas por sede
  const verificacionesPorSede = await prisma.sesionInventario.groupBy({
    by: ["sedeId"],
    _sum: {
      totalVerificados: true,
      totalEncontrados: true,
      totalNoEncontrados: true,
      totalReubicados: true,
      totalSobrantes: true,
    },
  })

  const statsMap = new Map(
    verificacionesPorSede.map((v) => [v.sedeId, v._sum])
  )

  const data = sedes.map((s) => {
    const stats = statsMap.get(s.id)
    return {
      ID: s.id,
      Código: s.codigo || "",
      Nombre: s.nombre,
      Dirección: s.direccion || "",
      Ciudad: s.ciudad || "",
      Teléfono: s.telefono || "",
      Email: s.email || "",
      "Dependencias": s._count.dependencias,
      "Usuarios": s._count.usuarios,
      "Sesiones Inventario": s._count.sesionesInventario,
      "Total Verificados": stats?.totalVerificados || 0,
      "Encontrados": stats?.totalEncontrados || 0,
      "No Encontrados": stats?.totalNoEncontrados || 0,
      "Reubicados": stats?.totalReubicados || 0,
      "Sobrantes": stats?.totalSobrantes || 0,
      Estado: s.activo ? "Activo" : "Inactivo",
      "Fecha Creación": s.createdAt.toISOString().split("T")[0],
    }
  })

  return NextResponse.json({
    tipo: "sedes",
    titulo: "Reporte de Sedes",
    total: data.length,
    columnas: [
      "ID", "Código", "Nombre", "Dirección", "Ciudad", "Teléfono", "Email",
      "Dependencias", "Usuarios", "Sesiones Inventario", "Total Verificados",
      "Encontrados", "No Encontrados", "Reubicados", "Sobrantes", "Estado", "Fecha Creación"
    ],
    datos: data,
  })
}

// Reporte de Verificaciones
async function getReporteVerificaciones(searchParams: URLSearchParams) {
  const sesionId = searchParams.get("sesionId")
  const resultado = searchParams.get("resultado")

  const where: Record<string, unknown> = {}
  if (sesionId) where.sesionId = sesionId
  if (resultado && resultado !== "all") where.resultado = resultado

  const verificaciones = await prisma.verificacionBien.findMany({
    where,
    include: {
      sesion: {
        select: {
          codigo: true,
          nombre: true,
          dependencia: { select: { nombre: true, siglas: true } },
        },
      },
      verificador: { select: { nombre: true, apellidos: true } },
    },
    orderBy: { fechaVerificacion: "desc" },
    take: 5000, // Limitar para evitar problemas de memoria
  })

  const data = verificaciones.map((v) => ({
    "Código Patrimonial": v.codigoPatrimonial,
    "Descripción SIGA": v.descripcionSiga || "",
    "Marca": v.marcaSiga || "",
    "Modelo": v.modeloSiga || "",
    "Serie": v.serieSiga || "",
    "Color": v.colorSiga || "",
    "Resultado": v.resultado,
    "Estado Físico": v.estadoFisico || "",
    "Ubicación SIGA": v.ubicacionSiga || "",
    "Ubicación Real": v.ubicacionReal || "",
    "Responsable SIGA": v.responsableSiga || "",
    "Usuario SIGA": v.usuarioSiga || "",
    "Responsable Real": v.responsableReal || "",
    "Dependencia SIGA": v.dependenciaSiga || "",
    "Valor Neto": v.valorSiga || 0,
    "Observaciones": v.observaciones || "",
    "Sesión": v.sesion.codigo,
    "Nombre Sesión": v.sesion.nombre,
    "Dependencia Sesión": v.sesion.dependencia?.nombre || "",
    "Verificador": v.verificador ? `${v.verificador.apellidos}, ${v.verificador.nombre}` : "",
    "Dispositivo": v.dispositivoTipo || "",
    "Fecha Verificación": v.fechaVerificacion.toISOString().split("T")[0],
    "Hora": v.fechaVerificacion.toISOString().split("T")[1].split(".")[0],
  }))

  return NextResponse.json({
    tipo: "verificaciones",
    titulo: "Reporte de Verificaciones",
    total: data.length,
    columnas: [
      "Código Patrimonial", "Descripción SIGA", "Marca", "Modelo", "Serie", "Color",
      "Resultado", "Estado Físico", "Ubicación SIGA", "Ubicación Real",
      "Responsable SIGA", "Usuario SIGA", "Responsable Real", "Dependencia SIGA",
      "Valor Neto", "Observaciones", "Sesión", "Nombre Sesión",
      "Dependencia Sesión", "Verificador", "Dispositivo", "Fecha Verificación", "Hora"
    ],
    datos: data,
  })
}

// Reporte Resumen General
async function getReporteResumen() {
  const [
    totalUsuarios,
    usuariosActivos,
    totalDependencias,
    dependenciasActivas,
    totalSedes,
    sedesActivas,
    totalSesiones,
    sesionesEstado,
    totalVerificaciones,
    verificacionesResultado,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { activo: true } }),
    prisma.dependencia.count(),
    prisma.dependencia.count({ where: { activo: true } }),
    prisma.sede.count(),
    prisma.sede.count({ where: { activo: true } }),
    prisma.sesionInventario.count(),
    prisma.sesionInventario.groupBy({
      by: ["estado"],
      _count: true,
    }),
    prisma.verificacionBien.count(),
    prisma.verificacionBien.groupBy({
      by: ["resultado"],
      _count: true,
    }),
  ])

  const sesionesMap = Object.fromEntries(
    sesionesEstado.map((s) => [s.estado, s._count])
  )
  const verificacionesMap = Object.fromEntries(
    verificacionesResultado.map((v) => [v.resultado, v._count])
  )

  const data = [
    { Categoría: "Usuarios", Métrica: "Total Usuarios", Valor: totalUsuarios },
    { Categoría: "Usuarios", Métrica: "Usuarios Activos", Valor: usuariosActivos },
    { Categoría: "Usuarios", Métrica: "Usuarios Inactivos", Valor: totalUsuarios - usuariosActivos },
    { Categoría: "Dependencias", Métrica: "Total Dependencias", Valor: totalDependencias },
    { Categoría: "Dependencias", Métrica: "Dependencias Activas", Valor: dependenciasActivas },
    { Categoría: "Sedes", Métrica: "Total Sedes", Valor: totalSedes },
    { Categoría: "Sedes", Métrica: "Sedes Activas", Valor: sedesActivas },
    { Categoría: "Inventario", Métrica: "Total Sesiones", Valor: totalSesiones },
    { Categoría: "Inventario", Métrica: "Sesiones Programadas", Valor: sesionesMap["PROGRAMADA"] || 0 },
    { Categoría: "Inventario", Métrica: "Sesiones En Proceso", Valor: sesionesMap["EN_PROCESO"] || 0 },
    { Categoría: "Inventario", Métrica: "Sesiones Finalizadas", Valor: sesionesMap["FINALIZADA"] || 0 },
    { Categoría: "Inventario", Métrica: "Sesiones Pausadas", Valor: sesionesMap["PAUSADA"] || 0 },
    { Categoría: "Inventario", Métrica: "Sesiones Canceladas", Valor: sesionesMap["CANCELADA"] || 0 },
    { Categoría: "Verificaciones", Métrica: "Total Verificaciones", Valor: totalVerificaciones },
    { Categoría: "Verificaciones", Métrica: "Bienes Encontrados", Valor: verificacionesMap["ENCONTRADO"] || 0 },
    { Categoría: "Verificaciones", Métrica: "Bienes No Encontrados", Valor: verificacionesMap["NO_ENCONTRADO"] || 0 },
    { Categoría: "Verificaciones", Métrica: "Bienes Reubicados", Valor: verificacionesMap["REUBICADO"] || 0 },
    { Categoría: "Verificaciones", Métrica: "Bienes Sobrantes", Valor: verificacionesMap["SOBRANTE"] || 0 },
  ]

  return NextResponse.json({
    tipo: "resumen",
    titulo: "Resumen General del Sistema",
    total: data.length,
    columnas: ["Categoría", "Métrica", "Valor"],
    datos: data,
  })
}
