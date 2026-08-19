import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"
import {
  esEquipoComputo,
  whereEquipoComputo,
  resumenSesiones,
} from "@/lib/reporte-consolidado"

// Etiquetas legibles para los enums
const LABEL_RESULTADO: Record<string, string> = {
  ENCONTRADO: "Encontrado",
  REUBICADO: "Reubicado",
  NO_ENCONTRADO: "No Encontrado",
  SOBRANTE: "Sobrante",
}

const LABEL_ESTADO_FISICO: Record<string, string> = {
  BUENO: "Bueno",
  REGULAR: "Regular",
  MALO: "Malo",
  INOPERATIVO: "Inoperativo",
  CHATARRA: "Chatarra",
}

const LABEL_SITUACION: Record<string, string> = {
  U: "Uso",
  D: "Desuso",
  F: "Faltante",
  S: "Sobrante",
}

const LABEL_ESTADO_SESION: Record<string, string> = {
  PROGRAMADA: "Programada",
  EN_PROCESO: "En Proceso",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
}

type VerificacionConsolidada = {
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  tipoSiga: string | null
  colorSiga: string | null
  serieSiga: string | null
  procesador: string | null
  generacion: string | null
  sistemaOperativo: string | null
  ram: string | null
  disco: string | null
  resultado: string
  estadoFisico: string | null
  situacion: string | null
  ubicacionSiga: string | null
  ubicacionReal: string | null
  dependenciaSiga: string | null
  responsableSiga: string | null
  responsableReal: string | null
  dniResponsableActual: string | null
  valorSiga: number | null
  observaciones: string | null
  fechaVerificacion: Date
  verificador: { nombre: string; apellidos: string } | null
  sesion: { codigo: string; nombre: string }
}

function formatFechaPeru(fecha: Date): string {
  return fecha.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// GET: Reporte consolidado de todas las sesiones de inventario.
// - Sin `formato`: JSON paginado con los equipos de cómputo de todas las sesiones.
// - Con `formato=excel`: archivo Excel con bienes verificados, equipos de
//   cómputo y resumen de todas las sesiones.
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const formato = searchParams.get("formato")
    const estado = searchParams.get("estado")
    const dependenciaId = searchParams.get("dependenciaId")

    // Filtro de sesiones compartido por ambos modos
    const whereSesion: Record<string, unknown> = {}
    if (estado && estado !== "all") whereSesion.estado = estado
    if (dependenciaId && dependenciaId !== "all") whereSesion.dependenciaId = dependenciaId

    if (formato !== "excel") {
      // ====== Modo JSON: equipos de cómputo paginados ======
      const page = parseInt(searchParams.get("page") || "1")
      const limit = parseInt(searchParams.get("limit") || "20")
      const skip = (page - 1) * limit

      const where = {
        ...whereEquipoComputo(),
        sesion: whereSesion,
      }

      const [equipos, total] = await Promise.all([
        prisma.verificacionBien.findMany({
          where,
          include: {
            sesion: { select: { id: true, codigo: true, nombre: true } },
          },
          orderBy: [{ sesion: { codigo: "asc" } }, { fechaVerificacion: "asc" }],
          skip,
          take: limit,
        }),
        prisma.verificacionBien.count({ where }),
      ])

      return NextResponse.json({
        equipos,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit,
        },
      })
    }

    // ====== Modo Excel: reporte consolidado ======
    const sesiones = await prisma.sesionInventario.findMany({
      where: whereSesion,
      include: {
        dependencia: { select: { nombre: true, siglas: true } },
      },
      orderBy: { codigo: "asc" },
    })

    const verificaciones = (await prisma.verificacionBien.findMany({
      where: { sesion: whereSesion },
      include: {
        verificador: { select: { nombre: true, apellidos: true } },
        sesion: { select: { codigo: true, nombre: true } },
      },
      orderBy: [{ sesion: { codigo: "asc" } }, { fechaVerificacion: "asc" }],
    })) as unknown as VerificacionConsolidada[]

    const equiposComputo = verificaciones.filter(esEquipoComputo)
    const resumen = resumenSesiones(sesiones)

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Sistema de Patrimonio UNAMAD"

    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    }

    // Aplica estilo de encabezado a una fila
    const estilizarEncabezado = (row: ExcelJS.Row, totalCols: number) => {
      row.height = 30
      row.font = { bold: true, size: 9, name: "Calibri", color: { argb: "FFFFFFFF" } }
      row.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      for (let c = 1; c <= totalCols; c++) {
        const cell = row.getCell(c)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1F4E79" },
        }
        cell.border = borderThin
      }
    }

    const agregarFilaDatos = (
      ws: ExcelJS.Worksheet,
      valores: Array<string | number>,
      totalCols: number
    ) => {
      const row = ws.addRow(valores)
      row.font = { size: 9, name: "Calibri" }
      row.alignment = { vertical: "middle", wrapText: false }
      for (let c = 1; c <= totalCols; c++) {
        row.getCell(c).border = borderThin
      }
      return row
    }

    // ====== HOJA 1: Bienes verificados de todas las sesiones ======
    const COLUMNAS_BIENES: Array<{
      header: string
      width: number
      valor: (v: VerificacionConsolidada, orden: number) => string | number
    }> = [
      { header: "N°", width: 6, valor: (_v, orden) => orden },
      { header: "Sesión", width: 16, valor: (v) => v.sesion.codigo },
      { header: "Código Patrimonial", width: 18, valor: (v) => v.codigoPatrimonial },
      { header: "Denominación", width: 38, valor: (v) => v.descripcionSiga || "" },
      { header: "Marca", width: 16, valor: (v) => v.marcaSiga || "" },
      { header: "Modelo", width: 16, valor: (v) => v.modeloSiga || "" },
      { header: "Tipo", width: 14, valor: (v) => v.tipoSiga || "" },
      { header: "Color", width: 12, valor: (v) => v.colorSiga || "" },
      { header: "Serie", width: 20, valor: (v) => v.serieSiga || "" },
      {
        header: "Resultado",
        width: 15,
        valor: (v) => LABEL_RESULTADO[v.resultado] || v.resultado,
      },
      {
        header: "Situación",
        width: 12,
        valor: (v) => (v.situacion ? LABEL_SITUACION[v.situacion] || v.situacion : ""),
      },
      {
        header: "Estado Físico",
        width: 14,
        valor: (v) =>
          v.estadoFisico ? LABEL_ESTADO_FISICO[v.estadoFisico] || v.estadoFisico : "",
      },
      { header: "Ubicación SIGA", width: 24, valor: (v) => v.ubicacionSiga || "" },
      { header: "Ubicación Real", width: 24, valor: (v) => v.ubicacionReal || "" },
      { header: "Dependencia SIGA", width: 30, valor: (v) => v.dependenciaSiga || "" },
      { header: "Responsable SIGA", width: 28, valor: (v) => v.responsableSiga || "" },
      { header: "Responsable Real", width: 28, valor: (v) => v.responsableReal || "" },
      { header: "DNI Responsable", width: 14, valor: (v) => v.dniResponsableActual || "" },
      { header: "Valor Neto (S/)", width: 15, valor: (v) => v.valorSiga ?? 0 },
      { header: "Procesador", width: 22, valor: (v) => v.procesador || "" },
      { header: "Generación", width: 14, valor: (v) => v.generacion || "" },
      { header: "RAM", width: 12, valor: (v) => v.ram || "" },
      { header: "Disco", width: 14, valor: (v) => v.disco || "" },
      { header: "Sistema Operativo", width: 20, valor: (v) => v.sistemaOperativo || "" },
      { header: "Observaciones", width: 34, valor: (v) => v.observaciones || "" },
      {
        header: "Verificador",
        width: 28,
        valor: (v) =>
          v.verificador ? `${v.verificador.apellidos} ${v.verificador.nombre}` : "",
      },
      {
        header: "Fecha Verificación",
        width: 18,
        valor: (v) => formatFechaPeru(v.fechaVerificacion),
      },
    ]

    const wsBienes = workbook.addWorksheet("Bienes Verificados", {
      views: [{ state: "frozen", ySplit: 1 }],
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    })

    wsBienes.columns = COLUMNAS_BIENES.map((c) => ({ width: c.width }))
    estilizarEncabezado(
      wsBienes.addRow(COLUMNAS_BIENES.map((c) => c.header)),
      COLUMNAS_BIENES.length
    )

    const colValorNeto = COLUMNAS_BIENES.findIndex((c) => c.header === "Valor Neto (S/)") + 1
    verificaciones.forEach((v, idx) => {
      const row = agregarFilaDatos(
        wsBienes,
        COLUMNAS_BIENES.map((c) => c.valor(v, idx + 1)),
        COLUMNAS_BIENES.length
      )
      row.getCell(colValorNeto).numFmt = "#,##0.00"
    })

    wsBienes.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNAS_BIENES.length },
    }

    // ====== HOJA 2: Equipos de cómputo de todas las sesiones ======
    const COLUMNAS_COMPUTO: Array<{
      header: string
      width: number
      valor: (v: VerificacionConsolidada, orden: number) => string | number
    }> = [
      { header: "N°", width: 6, valor: (_v, orden) => orden },
      { header: "Sesión", width: 16, valor: (v) => v.sesion.codigo },
      { header: "Código Patrimonial", width: 18, valor: (v) => v.codigoPatrimonial },
      { header: "Denominación", width: 38, valor: (v) => v.descripcionSiga || "" },
      { header: "Marca", width: 16, valor: (v) => v.marcaSiga || "" },
      { header: "Modelo", width: 16, valor: (v) => v.modeloSiga || "" },
      { header: "Serie", width: 20, valor: (v) => v.serieSiga || "" },
      { header: "Procesador", width: 22, valor: (v) => v.procesador || "" },
      { header: "Generación", width: 14, valor: (v) => v.generacion || "" },
      { header: "RAM", width: 12, valor: (v) => v.ram || "" },
      { header: "Disco", width: 14, valor: (v) => v.disco || "" },
      { header: "Sistema Operativo", width: 20, valor: (v) => v.sistemaOperativo || "" },
      {
        header: "Resultado",
        width: 15,
        valor: (v) => LABEL_RESULTADO[v.resultado] || v.resultado,
      },
      {
        header: "Estado Físico",
        width: 14,
        valor: (v) =>
          v.estadoFisico ? LABEL_ESTADO_FISICO[v.estadoFisico] || v.estadoFisico : "",
      },
      {
        header: "Ubicación Real",
        width: 24,
        valor: (v) => v.ubicacionReal || v.ubicacionSiga || "",
      },
      { header: "Responsable Real", width: 28, valor: (v) => v.responsableReal || "" },
      { header: "DNI Responsable", width: 14, valor: (v) => v.dniResponsableActual || "" },
      { header: "Observaciones", width: 34, valor: (v) => v.observaciones || "" },
    ]

    const wsComputo = workbook.addWorksheet("Equipos de Cómputo", {
      views: [{ state: "frozen", ySplit: 1 }],
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    })

    wsComputo.columns = COLUMNAS_COMPUTO.map((c) => ({ width: c.width }))
    estilizarEncabezado(
      wsComputo.addRow(COLUMNAS_COMPUTO.map((c) => c.header)),
      COLUMNAS_COMPUTO.length
    )

    if (equiposComputo.length === 0) {
      const row = wsComputo.addRow([
        "",
        "",
        "Sin equipos de cómputo con especificaciones técnicas registradas",
      ])
      row.font = { size: 9, name: "Calibri", italic: true }
    } else {
      equiposComputo.forEach((v, idx) => {
        agregarFilaDatos(
          wsComputo,
          COLUMNAS_COMPUTO.map((c) => c.valor(v, idx + 1)),
          COLUMNAS_COMPUTO.length
        )
      })

      wsComputo.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: COLUMNAS_COMPUTO.length },
      }
    }

    // ====== HOJA 3: Resumen consolidado ======
    const wsResumen = workbook.addWorksheet("Resumen")
    wsResumen.columns = [
      { width: 32 },
      { width: 44 },
      { width: 14 },
      { width: 13 },
      { width: 13 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
    ]

    const agregarTitulo = (texto: string) => {
      const row = wsResumen.addRow([texto])
      row.font = { bold: true, size: 11, name: "Calibri" }
    }

    const agregarDato = (etiqueta: string, valor: string | number) => {
      const row = wsResumen.addRow([etiqueta, valor])
      row.getCell(1).font = { bold: true, size: 9, name: "Calibri" }
      row.getCell(2).font = { size: 9, name: "Calibri" }
    }

    agregarTitulo("UNIVERSIDAD NACIONAL AMAZÓNICA DE MADRE DE DIOS")
    agregarTitulo("REPORTE CONSOLIDADO DE SESIONES DE INVENTARIO")
    wsResumen.addRow([])

    agregarDato("Total de sesiones", resumen.totalSesiones)
    agregarDato("Sesiones finalizadas", resumen.sesionesFinalizadas)
    agregarDato("Sesiones en proceso", resumen.sesionesEnProceso)
    agregarDato("Total bienes en SIGA", resumen.totalBienesSiga)
    agregarDato("Total verificados", resumen.totalVerificados)
    agregarDato("Encontrados", resumen.totalEncontrados)
    agregarDato("Reubicados", resumen.totalReubicados)
    agregarDato("No encontrados", resumen.totalNoEncontrados)
    agregarDato("Sobrantes", resumen.totalSobrantes)
    agregarDato("Equipos de cómputo", equiposComputo.length)
    wsResumen.addRow([])

    agregarTitulo("DETALLE POR SESIÓN")
    const encabezadoSesiones = wsResumen.addRow([
      "Código",
      "Nombre",
      "Estado",
      "Verificados",
      "Encontrados",
      "Reubicados",
      "No Encontrados",
      "Sobrantes",
    ])
    estilizarEncabezado(encabezadoSesiones, 8)

    sesiones.forEach((s) => {
      agregarFilaDatos(
        wsResumen,
        [
          s.codigo,
          s.nombre,
          LABEL_ESTADO_SESION[s.estado] || s.estado,
          s.totalVerificados,
          s.totalEncontrados,
          s.totalReubicados,
          s.totalNoEncontrados,
          s.totalSobrantes,
        ],
        8
      )
    })
    wsResumen.addRow([])

    agregarTitulo("DETALLE DEL ARCHIVO")
    agregarDato("Registros exportados", verificaciones.length)
    agregarDato(
      "Filtro por estado",
      estado && estado !== "all" ? LABEL_ESTADO_SESION[estado] || estado : "Todos"
    )
    agregarDato("Fecha de generación", formatFechaPeru(new Date()))
    agregarDato(
      "Generado por",
      `${session.apellidos} ${session.nombre}`.trim() || session.email
    )

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `Reporte_Consolidado_${new Date().toISOString().split("T")[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error al generar reporte consolidado:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte consolidado" },
      { status: 500 }
    )
  }
}
