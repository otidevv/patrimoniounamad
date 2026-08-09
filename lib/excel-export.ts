import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

interface Usuario {
  id: string
  email: string
  nombre: string
  apellidos: string
  tipoDocumento: string
  numeroDocumento: string | null
  cargo: string | null
  telefono: string | null
  activo: boolean
  rol: {
    nombre: string
    color: string
  } | null
  dependencia: {
    nombre: string
    siglas: string | null
  } | null
  createdAt: string
}

const TIPOS_DOCUMENTO: Record<string, string> = {
  DNI: "DNI",
  PASAPORTE: "Pasaporte",
  CARNET_EXTRANJERIA: "Carnet de Extranjería",
  PTP: "PTP",
  OTRO: "Otro",
}

export async function exportUsuariosToExcel(usuarios: Usuario[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "SIGA Patrimonio UNAMAD"
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet("Usuarios", {
    views: [{ state: "frozen", ySplit: 4 }],
  })

  // Configurar anchos de columna
  worksheet.columns = [
    { key: "numero", width: 6 },
    { key: "nombre", width: 25 },
    { key: "apellidos", width: 25 },
    { key: "email", width: 35 },
    { key: "tipoDoc", width: 18 },
    { key: "numDoc", width: 15 },
    { key: "cargo", width: 25 },
    { key: "telefono", width: 15 },
    { key: "rol", width: 18 },
    { key: "dependencia", width: 30 },
    { key: "estado", width: 12 },
    { key: "fechaCreacion", width: 18 },
  ]

  // Colores institucionales
  const colorPrimario = "1E3A5F" // Azul UNAMAD
  const colorSecundario = "DB0455" // Rojo UNAMAD
  const colorGrisClaro = "F5F5F5"
  const colorGris = "E0E0E0"

  // Título principal
  worksheet.mergeCells("A1:L1")
  const titleCell = worksheet.getCell("A1")
  titleCell.value = "SISTEMA DE GESTIÓN PATRIMONIAL - UNAMAD"
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFF" } }
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorPrimario },
  }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(1).height = 30

  // Subtítulo
  worksheet.mergeCells("A2:L2")
  const subtitleCell = worksheet.getCell("A2")
  subtitleCell.value = "REPORTE DE USUARIOS DEL SISTEMA"
  subtitleCell.font = { bold: true, size: 12, color: { argb: "FFFFFF" } }
  subtitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorSecundario },
  }
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(2).height = 25

  // Fecha de generación
  worksheet.mergeCells("A3:L3")
  const dateCell = worksheet.getCell("A3")
  dateCell.value = `Fecha de generación: ${new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`
  dateCell.font = { italic: true, size: 10, color: { argb: "666666" } }
  dateCell.alignment = { horizontal: "right", vertical: "middle" }
  worksheet.getRow(3).height = 20

  // Encabezados
  const headers = [
    "N°",
    "Nombre",
    "Apellidos",
    "Correo Electrónico",
    "Tipo Doc.",
    "Núm. Doc.",
    "Cargo",
    "Teléfono",
    "Rol",
    "Dependencia",
    "Estado",
    "Fecha Registro",
  ]

  const headerRow = worksheet.getRow(4)
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = header
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFF" } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colorPrimario },
    }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFF" } },
    }
  })
  headerRow.height = 25

  // Datos
  usuarios.forEach((usuario, index) => {
    const rowNumber = index + 5
    const row = worksheet.getRow(rowNumber)

    const rowData = [
      index + 1,
      usuario.nombre,
      usuario.apellidos,
      usuario.email,
      TIPOS_DOCUMENTO[usuario.tipoDocumento] || usuario.tipoDocumento,
      usuario.numeroDocumento || "-",
      usuario.cargo || "-",
      usuario.telefono || "-",
      usuario.rol?.nombre || "Sin rol",
      usuario.dependencia?.nombre || "Sin asignar",
      usuario.activo ? "Activo" : "Inactivo",
      new Date(usuario.createdAt).toLocaleDateString("es-PE"),
    ]

    rowData.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1)
      cell.value = value

      // Estilo base
      cell.font = { size: 10 }
      cell.alignment = {
        horizontal: colIndex === 0 ? "center" : "left",
        vertical: "middle",
      }

      // Filas alternadas
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorGrisClaro },
        }
      }

      // Bordes
      cell.border = {
        top: { style: "thin", color: { argb: colorGris } },
        bottom: { style: "thin", color: { argb: colorGris } },
        left: { style: "thin", color: { argb: colorGris } },
        right: { style: "thin", color: { argb: colorGris } },
      }

      // Estilo especial para columna de estado
      if (colIndex === 10) {
        cell.alignment = { horizontal: "center", vertical: "middle" }
        if (value === "Activo") {
          cell.font = { size: 10, bold: true, color: { argb: "16A34A" } }
        } else {
          cell.font = { size: 10, bold: true, color: { argb: "DC2626" } }
        }
      }

      // Número centrado
      if (colIndex === 0) {
        cell.font = { size: 10, bold: true }
      }
    })

    row.height = 22
  })

  // Fila de totales
  const totalRowNumber = usuarios.length + 5
  worksheet.mergeCells(`A${totalRowNumber}:J${totalRowNumber}`)
  const totalCell = worksheet.getCell(`A${totalRowNumber}`)
  totalCell.value = `Total de usuarios: ${usuarios.length}`
  totalCell.font = { bold: true, size: 11 }
  totalCell.alignment = { horizontal: "right", vertical: "middle" }
  totalCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorGris },
  }

  const activeCount = usuarios.filter((u) => u.activo).length
  const inactiveCount = usuarios.length - activeCount

  worksheet.getCell(`K${totalRowNumber}`).value = activeCount
  worksheet.getCell(`K${totalRowNumber}`).font = {
    bold: true,
    size: 11,
    color: { argb: "16A34A" },
  }
  worksheet.getCell(`K${totalRowNumber}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  }
  worksheet.getCell(`K${totalRowNumber}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorGris },
  }

  worksheet.getCell(`L${totalRowNumber}`).value = `${inactiveCount} inactivos`
  worksheet.getCell(`L${totalRowNumber}`).font = {
    bold: true,
    size: 10,
    color: { argb: "DC2626" },
  }
  worksheet.getCell(`L${totalRowNumber}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  }
  worksheet.getCell(`L${totalRowNumber}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorGris },
  }

  worksheet.getRow(totalRowNumber).height = 25

  // Pie de página
  const footerRowNumber = totalRowNumber + 2
  worksheet.mergeCells(`A${footerRowNumber}:L${footerRowNumber}`)
  const footerCell = worksheet.getCell(`A${footerRowNumber}`)
  footerCell.value =
    "Universidad Nacional Amazónica de Madre de Dios - Oficina de Control Patrimonial"
  footerCell.font = { italic: true, size: 9, color: { argb: "999999" } }
  footerCell.alignment = { horizontal: "center", vertical: "middle" }

  // Generar y descargar el archivo
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const fileName = `usuarios_${new Date().toISOString().split("T")[0]}.xlsx`
  saveAs(blob, fileName)
}

// ─────────────────────────────────────────────────────────────
// Exportación de "Mis bienes" (bienes patrimoniales SIGA)
// ─────────────────────────────────────────────────────────────

interface BienExcel {
  codigo_patrimonial: string
  descripcion: string
  nombre_sede: string | null
  nombre_depend: string | null
  ubicacion_fisica: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
  color: string | null
  fecha_alta: string | null
  valor_compra: number | null
  valor_neto: number | null
}

interface UsuarioExportInfo {
  nombre: string
  documento: string
}

export async function exportMisBienesToExcel(
  bienes: BienExcel[],
  usuario?: UsuarioExportInfo | null
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "SIGA Patrimonio UNAMAD"
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet("Mis Bienes", {
    views: [{ state: "frozen", ySplit: 4 }],
  })

  // Configurar anchos de columna
  worksheet.columns = [
    { key: "numero", width: 6 },
    { key: "codigo", width: 18 },
    { key: "descripcion", width: 40 },
    { key: "marca", width: 18 },
    { key: "modelo", width: 18 },
    { key: "serie", width: 18 },
    { key: "color", width: 14 },
    { key: "dependencia", width: 30 },
    { key: "ubicacion", width: 28 },
    { key: "sede", width: 22 },
    { key: "fechaAlta", width: 14 },
    { key: "valorCompra", width: 16 },
    { key: "valorNeto", width: 16 },
  ]

  // Colores institucionales
  const colorPrimario = "1E3A5F" // Azul UNAMAD
  const colorSecundario = "DB0455" // Rojo UNAMAD
  const colorGrisClaro = "F5F5F5"
  const colorGris = "E0E0E0"
  const ultimaColumna = "M" // 13 columnas

  // Título principal
  worksheet.mergeCells(`A1:${ultimaColumna}1`)
  const titleCell = worksheet.getCell("A1")
  titleCell.value = "SISTEMA DE GESTIÓN PATRIMONIAL - UNAMAD"
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFF" } }
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorPrimario },
  }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(1).height = 30

  // Subtítulo
  worksheet.mergeCells(`A2:${ultimaColumna}2`)
  const subtitleCell = worksheet.getCell("A2")
  subtitleCell.value = usuario
    ? `MIS BIENES PATRIMONIALES - ${usuario.nombre} (DNI ${usuario.documento})`
    : "MIS BIENES PATRIMONIALES"
  subtitleCell.font = { bold: true, size: 12, color: { argb: "FFFFFF" } }
  subtitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorSecundario },
  }
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getRow(2).height = 25

  // Fecha de generación
  worksheet.mergeCells(`A3:${ultimaColumna}3`)
  const dateCell = worksheet.getCell("A3")
  dateCell.value = `Fecha de generación: ${new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`
  dateCell.font = { italic: true, size: 10, color: { argb: "666666" } }
  dateCell.alignment = { horizontal: "right", vertical: "middle" }
  worksheet.getRow(3).height = 20

  // Encabezados
  const headers = [
    "N°",
    "Código Patrimonial",
    "Descripción",
    "Marca",
    "Modelo",
    "Serie",
    "Color",
    "Dependencia",
    "Ubicación Física",
    "Sede",
    "Fecha Alta",
    "Valor Compra",
    "Valor Neto",
  ]

  const headerRow = worksheet.getRow(4)
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = header
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFF" } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colorPrimario },
    }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.border = {
      top: { style: "thin", color: { argb: "FFFFFF" } },
      bottom: { style: "thin", color: { argb: "FFFFFF" } },
      left: { style: "thin", color: { argb: "FFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFF" } },
    }
  })
  headerRow.height = 25

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "-"
    const d = new Date(fecha)
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-PE")
  }

  // Datos
  bienes.forEach((bien, index) => {
    const rowNumber = index + 5
    const row = worksheet.getRow(rowNumber)

    const rowData = [
      index + 1,
      bien.codigo_patrimonial,
      bien.descripcion || "-",
      bien.marca || "-",
      bien.modelo || "-",
      bien.serie || "-",
      bien.color || "-",
      bien.nombre_depend || "-",
      bien.ubicacion_fisica || "-",
      bien.nombre_sede || "-",
      formatFecha(bien.fecha_alta),
      bien.valor_compra ?? null,
      bien.valor_neto ?? null,
    ]

    rowData.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1)
      cell.value = value

      // Estilo base
      cell.font = { size: 10 }
      cell.alignment = {
        horizontal: colIndex === 0 ? "center" : "left",
        vertical: "middle",
      }

      // Filas alternadas
      if (index % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colorGrisClaro },
        }
      }

      // Bordes
      cell.border = {
        top: { style: "thin", color: { argb: colorGris } },
        bottom: { style: "thin", color: { argb: colorGris } },
        left: { style: "thin", color: { argb: colorGris } },
        right: { style: "thin", color: { argb: colorGris } },
      }

      // Columnas de valor (compra y neto) → moneda y alineadas a la derecha
      if (colIndex === 11 || colIndex === 12) {
        cell.alignment = { horizontal: "right", vertical: "middle" }
        if (typeof value === "number") {
          cell.numFmt = '"S/ "#,##0.00'
        }
      }

      // Código patrimonial en negrita
      if (colIndex === 1) {
        cell.font = { size: 10, bold: true, color: { argb: colorPrimario } }
      }

      // Número centrado
      if (colIndex === 0) {
        cell.font = { size: 10, bold: true }
      }
    })

    row.height = 22
  })

  // Fila de totales
  const totalRowNumber = bienes.length + 5
  worksheet.mergeCells(`A${totalRowNumber}:K${totalRowNumber}`)
  const totalCell = worksheet.getCell(`A${totalRowNumber}`)
  totalCell.value = `Total de bienes: ${bienes.length}`
  totalCell.font = { bold: true, size: 11 }
  totalCell.alignment = { horizontal: "right", vertical: "middle" }
  totalCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorGris },
  }

  const totalCompra = bienes.reduce((acc, b) => acc + (b.valor_compra || 0), 0)
  const totalNeto = bienes.reduce((acc, b) => acc + (b.valor_neto || 0), 0)

  const totalCompraCell = worksheet.getCell(`L${totalRowNumber}`)
  totalCompraCell.value = totalCompra
  totalCompraCell.numFmt = '"S/ "#,##0.00'
  totalCompraCell.font = { bold: true, size: 10 }
  totalCompraCell.alignment = { horizontal: "right", vertical: "middle" }
  totalCompraCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorGris },
  }

  const totalNetoCell = worksheet.getCell(`M${totalRowNumber}`)
  totalNetoCell.value = totalNeto
  totalNetoCell.numFmt = '"S/ "#,##0.00'
  totalNetoCell.font = { bold: true, size: 10, color: { argb: "16A34A" } }
  totalNetoCell.alignment = { horizontal: "right", vertical: "middle" }
  totalNetoCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorGris },
  }

  worksheet.getRow(totalRowNumber).height = 25

  // Pie de página
  const footerRowNumber = totalRowNumber + 2
  worksheet.mergeCells(`A${footerRowNumber}:${ultimaColumna}${footerRowNumber}`)
  const footerCell = worksheet.getCell(`A${footerRowNumber}`)
  footerCell.value =
    "Universidad Nacional Amazónica de Madre de Dios - Oficina de Control Patrimonial"
  footerCell.font = { italic: true, size: 9, color: { argb: "999999" } }
  footerCell.alignment = { horizontal: "center", vertical: "middle" }

  // Generar y descargar el archivo
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const fileName = `mis_bienes_${new Date().toISOString().split("T")[0]}.xlsx`
  saveAs(blob, fileName)
}
