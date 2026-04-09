import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { readFile } from "fs/promises"
import path from "path"

interface BienActa {
  equipo: string
  marca: string
  modelo: string
  serie: string
  patrimonio: string
}

interface DatosActa {
  numero: string
  anio: number
  siglasOrigen: string
  // Quien entrega
  nombreEntrega: string
  cargoEntrega: string
  dependenciaEntrega: string
  // Quien recibe
  nombreRecibe: string
  cargoRecibe: string
  dependenciaRecibe: string
  // Bienes
  bienes: BienActa[]
  estadoConservacion?: string
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_LEFT = 70
const MARGIN_RIGHT = 70
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

function formatearFecha(date: Date): string {
  const dias = date.getDate()
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ]
  return `${String(dias).padStart(2, "0")} días del mes de ${meses[date.getMonth()]} del año ${date.getFullYear()}`
}

function formatearHora(date: Date): string {
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const ampm = hours >= 12 ? "pm" : "am"
  const h = hours % 12 || 12
  return `${String(h).padStart(2, "0")}:${minutes} ${ampm}`
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)
    if (width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function drawCenteredText(
  page: any, text: string, y: number,
  font: any, fontSize: number, color: any
) {
  const textWidth = font.widthOfTextAtSize(text, fontSize)
  page.drawText(text, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y,
    size: fontSize,
    font,
    color,
  })
}

export async function generarActaEntregaPDF(datos: DatosActa): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const black = rgb(0, 0, 0)
  const darkBlue = rgb(0.05, 0.15, 0.35)
  const gray = rgb(0.3, 0.3, 0.3)

  let y = PAGE_HEIGHT - 45

  // ======= ENCABEZADO INSTITUCIONAL =======

  // Cargar logo
  const logoSize = 55
  try {
    const logoPath = path.join(process.cwd(), "public", "logos", "logounamad.png")
    const logoBytes = await readFile(logoPath)
    const logoImage = await pdfDoc.embedPng(logoBytes)

    // Logo izquierda
    page.drawImage(logoImage, {
      x: MARGIN_LEFT,
      y: y - logoSize + 10,
      width: logoSize,
      height: logoSize,
    })

    // Logo derecha
    page.drawImage(logoImage, {
      x: PAGE_WIDTH - MARGIN_RIGHT - logoSize,
      y: y - logoSize + 10,
      width: logoSize,
      height: logoSize,
    })
  } catch {
    // Si no se puede cargar el logo, continuar sin el
  }

  // Texto institucional centrado
  drawCenteredText(page, "Universidad Nacional Amazónica de Madre de Dios", y, fontBold, 11, darkBlue)
  y -= 14
  drawCenteredText(page, datos.dependenciaEntrega.toUpperCase(), y, fontBold, 8.5, darkBlue)
  y -= 13
  drawCenteredText(
    page,
    "\u201CMadre de Dios Capital de la Biodiversidad del Perú\u201D",
    y, fontItalic, 7.5, gray
  )

  y -= 12

  // Linea separadora
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 1.5,
    color: darkBlue,
  })
  page.drawLine({
    start: { x: MARGIN_LEFT, y: y - 2 },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: y - 2 },
    thickness: 0.5,
    color: darkBlue,
  })

  y -= 25

  // ======= TITULO =======
  const titulo = `ACTA DE ENTREGA DE BIEN N\u00B0 ${datos.numero}-${datos.anio}-${datos.siglasOrigen}`
  drawCenteredText(page, titulo, y, fontBold, 12, black)

  // Subrayado
  const tituloWidth = fontBold.widthOfTextAtSize(titulo, 12)
  page.drawLine({
    start: { x: (PAGE_WIDTH - tituloWidth) / 2, y: y - 3 },
    end: { x: (PAGE_WIDTH + tituloWidth) / 2, y: y - 3 },
    thickness: 1,
    color: black,
  })

  y -= 30

  // ======= PARRAFO NARRATIVO =======
  const ahora = new Date()
  const fechaTexto = formatearFecha(ahora)
  const horaTexto = formatearHora(ahora)

  const descripcionesBienes = datos.bienes.map((b, i) => {
    const num = String(i + 1).padStart(2, "0")
    return `${num} ${b.equipo.toLowerCase()}`
  })
  const bienesTexto = descripcionesBienes.join(", ")

  const parrafo =
    `En la ciudad de Puerto Maldonado, a los ${fechaTexto} a horas ${horaTexto}, ` +
    `el/la ${datos.cargoEntrega} de la ${datos.dependenciaEntrega}, ` +
    `${datos.nombreEntrega}, hace la entrega al/a la ${datos.cargoRecibe} de la ` +
    `${datos.dependenciaRecibe}, ${datos.nombreRecibe}, en calidad de transferencia ` +
    `${bienesTexto}, del bien patrimonial en estado de conservación ` +
    `${datos.estadoConservacion || "bueno"} y operativo, según el siguiente detalle:`

  const fontSize = 10
  const lineHeight = 14
  const lines = wrapText(parrafo, fontRegular, fontSize, CONTENT_WIDTH)

  for (const line of lines) {
    let drawn = false
    const boldParts = [datos.nombreEntrega, datos.nombreRecibe]
    let remainingLine = line
    let xPos = MARGIN_LEFT

    for (const boldPart of boldParts) {
      const idx = remainingLine.indexOf(boldPart)
      if (idx >= 0) {
        drawn = true
        const before = remainingLine.substring(0, idx)
        if (before) {
          page.drawText(before, { x: xPos, y, size: fontSize, font: fontRegular, color: black })
          xPos += fontRegular.widthOfTextAtSize(before, fontSize)
        }
        page.drawText(boldPart, { x: xPos, y, size: fontSize, font: fontBold, color: black })
        xPos += fontBold.widthOfTextAtSize(boldPart, fontSize)
        remainingLine = remainingLine.substring(idx + boldPart.length)
      }
    }

    if (drawn && remainingLine) {
      page.drawText(remainingLine, { x: xPos, y, size: fontSize, font: fontRegular, color: black })
    } else if (!drawn) {
      page.drawText(line, { x: MARGIN_LEFT, y, size: fontSize, font: fontRegular, color: black })
    }

    y -= lineHeight
  }

  y -= 8

  // ======= DESCRIPCION DEL EQUIPO =======
  page.drawText("Descripción del equipo:", {
    x: MARGIN_LEFT, y, size: 10, font: fontBold, color: black,
  })

  y -= 18

  // ======= TABLA DE BIENES =======
  const colWidths = [28, 148, 68, 85, 78, 78]
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)
  const tableX = MARGIN_LEFT + (CONTENT_WIDTH - tableWidth) / 2
  const rowHeight = 18
  const headerFontSize = 8
  const cellFontSize = 7.5
  const cellPadding = 4

  const headers = ["N\u00BA", "EQUIPO", "MARCA", "MODELO", "SERIE", "PATRIMONIO"]

  let tableY = y

  // Header background
  page.drawRectangle({
    x: tableX,
    y: tableY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: rgb(0.92, 0.92, 0.95),
  })

  // Borde superior
  page.drawLine({
    start: { x: tableX, y: tableY },
    end: { x: tableX + tableWidth, y: tableY },
    thickness: 1, color: black,
  })

  // Header text
  let colX = tableX
  for (let i = 0; i < headers.length; i++) {
    const textWidth = fontBold.widthOfTextAtSize(headers[i], headerFontSize)
    page.drawText(headers[i], {
      x: colX + (colWidths[i] - textWidth) / 2,
      y: tableY - 13,
      size: headerFontSize,
      font: fontBold,
      color: black,
    })
    colX += colWidths[i]
  }

  tableY -= rowHeight

  // Borde inferior header
  page.drawLine({
    start: { x: tableX, y: tableY },
    end: { x: tableX + tableWidth, y: tableY },
    thickness: 1, color: black,
  })

  // Filas de bienes
  for (let rowIdx = 0; rowIdx < datos.bienes.length; rowIdx++) {
    const bien = datos.bienes[rowIdx]
    const cellValues = [
      String(rowIdx + 1).padStart(2, "0"),
      bien.equipo.toUpperCase(),
      bien.marca.toUpperCase(),
      bien.modelo.toUpperCase(),
      bien.serie.toUpperCase(),
      bien.patrimonio || "S/N",
    ]

    let maxLines = 1
    const cellLines: string[][] = []
    for (let i = 0; i < cellValues.length; i++) {
      const cl = wrapText(cellValues[i], fontRegular, cellFontSize, colWidths[i] - cellPadding * 2)
      cellLines.push(cl)
      if (cl.length > maxLines) maxLines = cl.length
    }

    const thisRowHeight = Math.max(rowHeight, maxLines * 11 + 8)

    // Fondo alternado
    if (rowIdx % 2 === 1) {
      page.drawRectangle({
        x: tableX,
        y: tableY - thisRowHeight,
        width: tableWidth,
        height: thisRowHeight,
        color: rgb(0.97, 0.97, 0.98),
      })
    }

    // Texto de cada celda
    colX = tableX
    for (let i = 0; i < cellValues.length; i++) {
      const cl = cellLines[i]
      for (let lineIdx = 0; lineIdx < cl.length; lineIdx++) {
        const textWidth = fontRegular.widthOfTextAtSize(cl[lineIdx], cellFontSize)
        const xText = i === 0
          ? colX + (colWidths[i] - textWidth) / 2
          : colX + cellPadding
        page.drawText(cl[lineIdx], {
          x: xText,
          y: tableY - 11 - lineIdx * 11,
          size: cellFontSize,
          font: fontRegular,
          color: black,
        })
      }
      colX += colWidths[i]
    }

    tableY -= thisRowHeight

    page.drawLine({
      start: { x: tableX, y: tableY },
      end: { x: tableX + tableWidth, y: tableY },
      thickness: 0.5, color: rgb(0.6, 0.6, 0.6),
    })
  }

  // Borde inferior tabla grueso
  page.drawLine({
    start: { x: tableX, y: tableY },
    end: { x: tableX + tableWidth, y: tableY },
    thickness: 1, color: black,
  })

  // Bordes verticales
  const tableTop = y
  const tableBottom = tableY
  colX = tableX
  for (let i = 0; i <= colWidths.length; i++) {
    page.drawLine({
      start: { x: colX, y: tableTop },
      end: { x: colX, y: tableBottom },
      thickness: i === 0 || i === colWidths.length ? 1 : 0.5,
      color: i === 0 || i === colWidths.length ? black : rgb(0.6, 0.6, 0.6),
    })
    if (i < colWidths.length) colX += colWidths[i]
  }

  y = tableBottom - 25

  // ======= TEXTO DE CONFORMIDAD =======
  const textoConformidad =
    "En señal de conformidad de la entrega y recepción de lo indicado, firman los presentes en la misma fecha, hora y lugar."

  const conformidadLines = wrapText(textoConformidad, fontRegular, fontSize, CONTENT_WIDTH)
  for (const line of conformidadLines) {
    page.drawText(line, { x: MARGIN_LEFT, y, size: fontSize, font: fontRegular, color: black })
    y -= lineHeight
  }

  y -= 55

  // ======= BLOQUES DE FIRMA =======
  const firmaLeftCenter = MARGIN_LEFT + CONTENT_WIDTH * 0.25
  const firmaRightCenter = MARGIN_LEFT + CONTENT_WIDTH * 0.75

  // Labels ENTREGA / RECIBE
  const entregaLabel = "ENTREGA"
  const recibeLabel = "RECIBE"
  drawCenteredAtX(page, entregaLabel, y, firmaLeftCenter, fontBold, 10, black)
  drawCenteredAtX(page, recibeLabel, y, firmaRightCenter, fontBold, 10, black)

  // Lineas de firma
  const lineaFirmaY = y - 50
  const lineWidth = 170
  page.drawLine({
    start: { x: firmaLeftCenter - lineWidth / 2, y: lineaFirmaY },
    end: { x: firmaLeftCenter + lineWidth / 2, y: lineaFirmaY },
    thickness: 0.5, color: black,
  })
  page.drawLine({
    start: { x: firmaRightCenter - lineWidth / 2, y: lineaFirmaY },
    end: { x: firmaRightCenter + lineWidth / 2, y: lineaFirmaY },
    thickness: 0.5, color: black,
  })

  // Datos quien entrega (centrado bajo la linea)
  let fy = lineaFirmaY - 13
  for (const line of wrapText(datos.nombreEntrega.toUpperCase(), fontBold, 8, lineWidth)) {
    drawCenteredAtX(page, line, fy, firmaLeftCenter, fontBold, 8, black)
    fy -= 11
  }
  drawCenteredAtX(page, datos.cargoEntrega.toUpperCase(), fy, firmaLeftCenter, fontRegular, 7, gray)
  fy -= 10
  for (const line of wrapText(datos.dependenciaEntrega.toUpperCase(), fontRegular, 7, lineWidth)) {
    drawCenteredAtX(page, line, fy, firmaLeftCenter, fontRegular, 7, gray)
    fy -= 10
  }

  // Datos quien recibe (centrado bajo la linea)
  fy = lineaFirmaY - 13
  for (const line of wrapText(datos.nombreRecibe.toUpperCase(), fontBold, 8, lineWidth)) {
    drawCenteredAtX(page, line, fy, firmaRightCenter, fontBold, 8, black)
    fy -= 11
  }
  drawCenteredAtX(page, datos.cargoRecibe.toUpperCase(), fy, firmaRightCenter, fontRegular, 7, gray)
  fy -= 10
  for (const line of wrapText(datos.dependenciaRecibe.toUpperCase(), fontRegular, 7, lineWidth)) {
    drawCenteredAtX(page, line, fy, firmaRightCenter, fontRegular, 7, gray)
    fy -= 10
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/** Dibuja texto centrado en una posicion X dada */
function drawCenteredAtX(
  page: any, text: string, y: number, centerX: number,
  font: any, fontSize: number, color: any
) {
  const textWidth = font.widthOfTextAtSize(text, fontSize)
  page.drawText(text, {
    x: centerX - textWidth / 2,
    y,
    size: fontSize,
    font,
    color,
  })
}
