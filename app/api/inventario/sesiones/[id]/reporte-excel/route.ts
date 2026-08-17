import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"

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

// Columnas comunes a todos los bienes
const COLUMNAS_BASE: Array<{ header: string; width: number }> = [
  { header: "N°", width: 6 },
  { header: "Código Patrimonial", width: 18 },
  { header: "Denominación", width: 38 },
  { header: "Marca", width: 16 },
  { header: "Modelo", width: 16 },
  { header: "Tipo", width: 14 },
  { header: "Color", width: 12 },
  { header: "Serie", width: 20 },
  { header: "Dimensiones", width: 16 },
  { header: "Otros", width: 16 },
  { header: "Resultado", width: 15 },
  { header: "Situación", width: 12 },
  { header: "Estado Físico", width: 14 },
  { header: "Ubicación SIGA", width: 24 },
  { header: "Ubicación Real", width: 24 },
  { header: "Dependencia SIGA", width: 30 },
  { header: "Responsable SIGA", width: 28 },
  { header: "Usuario SIGA", width: 28 },
  { header: "Responsable Real", width: 28 },
  { header: "DNI Responsable", width: 14 },
  { header: "Valor Neto (S/)", width: 15 },
  { header: "Observaciones", width: 34 },
  { header: "Verificador", width: 28 },
  { header: "Dispositivo", width: 12 },
  { header: "Fecha Verificación", width: 18 },
]

// Columnas adicionales para equipos de cómputo (especificaciones técnicas)
const COLUMNAS_COMPUTO: Array<{ header: string; width: number }> = [
  { header: "Procesador", width: 22 },
  { header: "Generación", width: 14 },
  { header: "RAM", width: 12 },
  { header: "Disco", width: 14 },
  { header: "Sistema Operativo", width: 20 },
]

type VerificacionRow = {
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  tipoSiga: string | null
  colorSiga: string | null
  serieSiga: string | null
  dimensionesSiga: string | null
  otrosSiga: string | null
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
  usuarioSiga: string | null
  responsableReal: string | null
  dniResponsableActual: string | null
  valorSiga: number | null
  observaciones: string | null
  fechaVerificacion: Date
  verificador: { nombre: string; apellidos: string } | null
  dispositivoTipo: string | null
}

// Un bien es equipo de cómputo si tiene alguna especificación técnica registrada
function esEquipoComputo(v: VerificacionRow): boolean {
  return Boolean(
    v.procesador || v.generacion || v.sistemaOperativo || v.ram || v.disco
  )
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

// Valores de las columnas base, en el mismo orden que COLUMNAS_BASE
function filaBase(v: VerificacionRow, orden: number): Array<string | number> {
  return [
    orden,
    v.codigoPatrimonial,
    v.descripcionSiga || "",
    v.marcaSiga || "",
    v.modeloSiga || "",
    v.tipoSiga || "",
    v.colorSiga || "",
    v.serieSiga || "",
    v.dimensionesSiga || "",
    v.otrosSiga || "",
    LABEL_RESULTADO[v.resultado] || v.resultado,
    v.situacion ? LABEL_SITUACION[v.situacion] || v.situacion : "",
    v.estadoFisico ? LABEL_ESTADO_FISICO[v.estadoFisico] || v.estadoFisico : "",
    v.ubicacionSiga || "",
    v.ubicacionReal || "",
    v.dependenciaSiga || "",
    v.responsableSiga || "",
    v.usuarioSiga || "",
    v.responsableReal || "",
    v.dniResponsableActual || "",
    v.valorSiga ?? 0,
    v.observaciones || "",
    v.verificador ? `${v.verificador.apellidos} ${v.verificador.nombre}` : "",
    v.dispositivoTipo || "",
    formatFechaPeru(v.fechaVerificacion),
  ]
}

// Valores de las columnas de cómputo, en el mismo orden que COLUMNAS_COMPUTO
function filaComputo(v: VerificacionRow): string[] {
  return [
    v.procesador || "",
    v.generacion || "",
    v.ram || "",
    v.disco || "",
    v.sistemaOperativo || "",
  ]
}

// GET: Reporte Excel de todos los bienes verificados en una sesión
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const resultado = searchParams.get("resultado")

    const sesion = await prisma.sesionInventario.findUnique({
      where: { id },
      include: {
        dependencia: { select: { nombre: true, siglas: true } },
        sede: { select: { nombre: true } },
        responsable: { select: { nombre: true, apellidos: true } },
      },
    })

    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    const where: Record<string, unknown> = { sesionId: id }
    if (resultado && resultado !== "all") {
      where.resultado = resultado
    }

    const verificaciones = (await prisma.verificacionBien.findMany({
      where,
      include: {
        verificador: { select: { nombre: true, apellidos: true } },
      },
      orderBy: { fechaVerificacion: "asc" },
    })) as unknown as VerificacionRow[]

    const equiposComputo = verificaciones.filter(esEquipoComputo)

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

    // ====== HOJA 1: Bienes verificados (todas las columnas) ======
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

    const columnasBienes = [...COLUMNAS_BASE, ...COLUMNAS_COMPUTO]
    wsBienes.columns = columnasBienes.map((c) => ({ width: c.width }))
    estilizarEncabezado(
      wsBienes.addRow(columnasBienes.map((c) => c.header)),
      columnasBienes.length
    )

    verificaciones.forEach((v, idx) => {
      const row = wsBienes.addRow([...filaBase(v, idx + 1), ...filaComputo(v)])
      row.font = { size: 9, name: "Calibri" }
      row.alignment = { vertical: "middle", wrapText: false }
      for (let c = 1; c <= columnasBienes.length; c++) {
        row.getCell(c).border = borderThin
      }
      // Valor neto con formato de moneda
      row.getCell(COLUMNAS_BASE.findIndex((c) => c.header === "Valor Neto (S/)") + 1)
        .numFmt = "#,##0.00"
    })

    wsBienes.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnasBienes.length },
    }

    // ====== HOJA 2: Equipos de cómputo (especificaciones técnicas al frente) ======
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

    // Columnas identificatorias + especificaciones técnicas + datos de verificación
    const COLUMNAS_COMPUTO_HOJA: Array<{
      header: string
      width: number
      valor: (v: VerificacionRow, orden: number) => string | number
    }> = [
      { header: "N°", width: 6, valor: (_v, orden) => orden },
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
      { header: "Ubicación Real", width: 24, valor: (v) => v.ubicacionReal || v.ubicacionSiga || "" },
      { header: "Responsable Real", width: 28, valor: (v) => v.responsableReal || "" },
      { header: "DNI Responsable", width: 14, valor: (v) => v.dniResponsableActual || "" },
      { header: "Observaciones", width: 34, valor: (v) => v.observaciones || "" },
    ]

    wsComputo.columns = COLUMNAS_COMPUTO_HOJA.map((c) => ({ width: c.width }))
    estilizarEncabezado(
      wsComputo.addRow(COLUMNAS_COMPUTO_HOJA.map((c) => c.header)),
      COLUMNAS_COMPUTO_HOJA.length
    )

    if (equiposComputo.length === 0) {
      const row = wsComputo.addRow(["", "Sin equipos de cómputo con especificaciones técnicas registradas"])
      row.font = { size: 9, name: "Calibri", italic: true }
    } else {
      equiposComputo.forEach((v, idx) => {
        const row = wsComputo.addRow(
          COLUMNAS_COMPUTO_HOJA.map((c) => c.valor(v, idx + 1))
        )
        row.font = { size: 9, name: "Calibri" }
        row.alignment = { vertical: "middle" }
        for (let c = 1; c <= COLUMNAS_COMPUTO_HOJA.length; c++) {
          row.getCell(c).border = borderThin
        }
      })

      wsComputo.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: COLUMNAS_COMPUTO_HOJA.length },
      }
    }

    // ====== HOJA 3: Resumen de la sesión ======
    const wsResumen = workbook.addWorksheet("Resumen")
    wsResumen.columns = [{ width: 32 }, { width: 60 }]

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
    agregarTitulo("REPORTE DE SESIÓN DE INVENTARIO")
    wsResumen.addRow([])

    agregarDato("Código de sesión", sesion.codigo)
    agregarDato("Nombre", sesion.nombre)
    agregarDato("Estado", sesion.estado)
    agregarDato(
      "Dependencia",
      sesion.sigaNombreDependencia || sesion.dependencia?.nombre || "—"
    )
    agregarDato("Sede", sesion.sede?.nombre || "—")
    agregarDato("Ubicación física", sesion.ubicacionFisica || "—")
    agregarDato(
      "Responsable",
      `${sesion.responsable.apellidos} ${sesion.responsable.nombre}`
    )
    agregarDato("Fecha programada", formatFechaPeru(sesion.fechaProgramada))
    agregarDato(
      "Fecha inicio",
      sesion.fechaInicio ? formatFechaPeru(sesion.fechaInicio) : "—"
    )
    agregarDato("Fecha fin", sesion.fechaFin ? formatFechaPeru(sesion.fechaFin) : "—")
    wsResumen.addRow([])

    agregarTitulo("RESULTADOS")
    agregarDato("Total bienes en SIGA", sesion.totalBienesSiga)
    agregarDato("Total verificados", sesion.totalVerificados)
    agregarDato("Encontrados", sesion.totalEncontrados)
    agregarDato("Reubicados", sesion.totalReubicados)
    agregarDato("No encontrados", sesion.totalNoEncontrados)
    agregarDato("Sobrantes", sesion.totalSobrantes)
    wsResumen.addRow([])

    agregarTitulo("DETALLE DEL ARCHIVO")
    agregarDato("Registros exportados", verificaciones.length)
    agregarDato("Equipos de cómputo", equiposComputo.length)
    agregarDato(
      "Filtro por resultado",
      resultado && resultado !== "all"
        ? LABEL_RESULTADO[resultado] || resultado
        : "Todos"
    )
    agregarDato("Fecha de generación", formatFechaPeru(new Date()))
    agregarDato(
      "Generado por",
      `${session.apellidos} ${session.nombre}`.trim() || session.email
    )

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `Reporte_${sesion.codigo}_${new Date().toISOString().split("T")[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error al generar reporte Excel de sesión:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte" },
      { status: 500 }
    )
  }
}
