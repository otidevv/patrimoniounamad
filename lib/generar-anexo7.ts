import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib"

export interface FilaAnexo7 {
  codigo: string
  denominacion: string
  marca: string
  modelo: string
  tipo: string
  color: string
  serie: string
  dimensiones: string
  otros: string
  situacion: string
  estadoConservacion: string
  observacion: string
}

export interface DatosAnexo7 {
  anio: number
  nombreUsuario: string
  nombreDependencia: string
  ubicacionFisica: string
  inventariadores: string[]
  equipoTrabajo: number
  filas: FilaAnexo7[]
}

// A4 horizontal
const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28
const MARGIN = 30
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

// Anchos de las 13 columnas de la tabla (suman CONTENT_WIDTH ≈ 782)
const COL_WIDTHS = [30, 62, 130, 60, 60, 45, 45, 70, 60, 55, 40, 60, 65]
const COL_HEADERS = [
  "N° DE\nORDEN",
  "CÓDIGO\nPATRIMONIAL",
  "DENOMINACIÓN",
  "MARCA",
  "MODELO",
  "TIPO",
  "COLOR",
  "SERIE",
  "DIMENSIONES",
  "OTROS",
  "SITUACIÓN\n(1)",
  "ESTADO DE\nCONSERV. (2)",
  "OBSERVACIÓN",
]

const black = rgb(0, 0, 0)
const headerFill = rgb(0.85, 0.89, 0.95)

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = String(text ?? "").split(/\s+/).filter(Boolean)
  if (words.length === 0) return [""]
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generarAnexo7PDF(datos: DatosAnexo7): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const fontSizeCell = 6.5
  const lineHeight = 8
  const cellPadding = 2.5

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - 35

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    font: PDFFont,
    size: number
  ) => {
    page.drawText(text, { x, y: yPos, size, font, color: black })
  }

  const drawRight = (text: string, yPos: number, font: PDFFont, size: number) => {
    const w = font.widthOfTextAtSize(text, size)
    drawText(text, PAGE_WIDTH - MARGIN - w, yPos, font, size)
  }

  const drawCentered = (text: string, yPos: number, font: PDFFont, size: number) => {
    const w = font.widthOfTextAtSize(text, size)
    drawText(text, (PAGE_WIDTH - w) / 2, yPos, font, size)
  }

  // ======= ENCABEZADO =======
  drawRight("ANEXO N°7", y, fontBold, 12)
  y -= 16
  drawCentered("FORMATO FICHA DE LEVANTAMIENTO DE INFORMACIÓN", y, fontBold, 11)
  y -= 14
  drawCentered(`INVENTARIO PATRIMONIAL ${datos.anio}`, y, fontBold, 11)
  y -= 18

  const fechaPeru = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
  )
  const fechaStr = `${String(fechaPeru.getDate()).padStart(2, "0")}/${String(
    fechaPeru.getMonth() + 1
  ).padStart(2, "0")}/${fechaPeru.getFullYear()}`

  const colDerechaX = MARGIN + CONTENT_WIDTH * 0.55

  drawText("ENTIDAD:", MARGIN, y, fontBold, 7.5)
  drawText("FECHA:", colDerechaX, y, fontBold, 7.5)
  drawText(fechaStr, colDerechaX + 40, y, fontRegular, 7.5)
  y -= 11
  drawText(
    "UNIVERSIDAD NACIONAL AMAZÓNICA DE MADRE DE DIOS",
    MARGIN,
    y,
    fontBold,
    7.5
  )
  y -= 13

  drawText("USUARIO:", MARGIN, y, fontBold, 7.5)
  drawText("PERSONAL INVENTARIADOR:", colDerechaX, y, fontBold, 7.5)
  y -= 11
  drawText("NOMBRES Y APELLIDOS:", MARGIN, y, fontBold, 7.5)
  drawText(datos.nombreUsuario, MARGIN + 100, y, fontRegular, 7.5)
  drawText("NOMBRES Y APELLIDOS:", colDerechaX, y, fontBold, 7.5)
  drawText(datos.inventariadores[0] || "", colDerechaX + 100, y, fontRegular, 7.5)
  y -= 11
  drawText("DEPENDENCIA/UNIDAD/OTROS:", MARGIN, y, fontBold, 7.5)
  drawText(datos.nombreDependencia, MARGIN + 125, y, fontRegular, 7.5)
  drawText("NOMBRES Y APELLIDOS:", colDerechaX, y, fontBold, 7.5)
  drawText(datos.inventariadores[1] || "", colDerechaX + 100, y, fontRegular, 7.5)
  y -= 11
  drawText("UBICACIÓN FÍSICA DE LOS BIENES:", MARGIN, y, fontBold, 7.5)
  drawText(datos.ubicacionFisica, MARGIN + 135, y, fontRegular, 7.5)
  drawText("EQUIPO DE TRABAJO:", colDerechaX, y, fontBold, 7.5)
  drawText(String(datos.equipoTrabajo || 1), colDerechaX + 90, y, fontRegular, 7.5)
  y -= 13
  drawText(
    "TIPO DE VERIFICACION: FÍSICA ( X )    DIGITAL (    )",
    MARGIN,
    y,
    fontBold,
    7.5
  )
  y -= 14

  // ======= TABLA =======
  const colX: number[] = []
  let acc = MARGIN
  for (const w of COL_WIDTHS) {
    colX.push(acc)
    acc += w
  }
  const tableRight = acc

  const drawCellBorders = (rowY: number, rowHeight: number) => {
    // Horizontales
    page.drawLine({
      start: { x: MARGIN, y: rowY },
      end: { x: tableRight, y: rowY },
      thickness: 0.5,
      color: black,
    })
    page.drawLine({
      start: { x: MARGIN, y: rowY - rowHeight },
      end: { x: tableRight, y: rowY - rowHeight },
      thickness: 0.5,
      color: black,
    })
    // Verticales
    for (let i = 0; i <= COL_WIDTHS.length; i++) {
      const x = i === COL_WIDTHS.length ? tableRight : colX[i]
      page.drawLine({
        start: { x, y: rowY },
        end: { x, y: rowY - rowHeight },
        thickness: 0.5,
        color: black,
      })
    }
  }

  const drawHeaderRow = () => {
    const headerHeight = 22
    page.drawRectangle({
      x: MARGIN,
      y: y - headerHeight,
      width: tableRight - MARGIN,
      height: headerHeight,
      color: headerFill,
    })
    drawCellBorders(y, headerHeight)
    COL_HEADERS.forEach((header, i) => {
      const lines = header.split("\n")
      const startY =
        y - headerHeight / 2 + ((lines.length - 1) * lineHeight) / 2 - 2
      lines.forEach((line, li) => {
        const w = fontBold.widthOfTextAtSize(line, 6)
        drawText(
          line,
          colX[i] + (COL_WIDTHS[i] - w) / 2,
          startY - li * lineHeight,
          fontBold,
          6
        )
      })
    })
    y -= headerHeight
  }

  drawHeaderRow()

  const bottomLimit = MARGIN + 20

  datos.filas.forEach((fila, index) => {
    const values = [
      String(index + 1),
      fila.codigo,
      fila.denominacion,
      fila.marca,
      fila.modelo,
      fila.tipo,
      fila.color,
      fila.serie,
      fila.dimensiones,
      fila.otros,
      fila.situacion,
      fila.estadoConservacion,
      fila.observacion,
    ]

    const wrapped = values.map((val, i) =>
      wrapText(val, fontRegular, fontSizeCell, COL_WIDTHS[i] - cellPadding * 2)
    )
    const maxLines = Math.max(...wrapped.map((l) => l.length))
    const rowHeight = maxLines * lineHeight + cellPadding * 2

    // Salto de página
    if (y - rowHeight < bottomLimit) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - 35
      drawHeaderRow()
    }

    drawCellBorders(y, rowHeight)
    wrapped.forEach((lines, i) => {
      const centered = i === 0 || i === 10 || i === 11
      lines.forEach((line, li) => {
        const w = fontRegular.widthOfTextAtSize(line, fontSizeCell)
        const x = centered
          ? colX[i] + (COL_WIDTHS[i] - w) / 2
          : colX[i] + cellPadding
        drawText(
          line,
          x,
          y - cellPadding - (li + 1) * lineHeight + 2,
          fontRegular,
          fontSizeCell
        )
      })
    })
    y -= rowHeight
  })

  // ======= PIE: LEYENDAS, CONSIDERACIONES Y FIRMAS =======
  const pieAltura = 150
  if (y - pieAltura < MARGIN) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - 35
  }

  y -= 12
  drawText("(1) Uso (U), Desuso (D)", MARGIN, y, fontRegular, 6.5)
  y -= 9
  drawText(
    "(2) El estado es consignado en base a la siguiente escala: Bueno, Regular, Malo, Chatarra y RAEE. En caso de semovientes, utilizar escala de acuerdo a su naturaleza.",
    MARGIN,
    y,
    fontRegular,
    6.5
  )
  y -= 13
  drawText("CONSIDERACIONES:", MARGIN, y, fontBold, 6.5)
  y -= 9

  const consideraciones = [
    "El usuario declara haber mostrado todos los bienes muebles que se encuentran bajo su responsabilidad y no contar con más bienes muebles materia de inventario.",
    "El usuario es responsable de la permanencia y conservación de cada uno de los bienes muebles descritos, se recomienda tomar las precauciones del caso para evitar sustracción, deterioros, etc.",
    "Cualquier necesidad de traslado del bien mueble dentro o fuera del local de la entidad u organización de la entidad, es previamente comunicado al encargado de la UBP.",
  ]
  for (const texto of consideraciones) {
    const lines = wrapText(`Ø  ${texto}`, fontRegular, 6.5, CONTENT_WIDTH)
    for (const line of lines) {
      drawText(line, MARGIN, y, fontRegular, 6.5)
      y -= 8.5
    }
  }

  // Áreas de firma: espacio en blanco donde FIRMA PERÚ estampa los sellos
  y -= 55
  const mitad = PAGE_WIDTH / 2
  const firmaLineWidth = 220

  page.drawLine({
    start: { x: mitad / 2 - firmaLineWidth / 2 + MARGIN / 2, y },
    end: { x: mitad / 2 + firmaLineWidth / 2 + MARGIN / 2, y },
    thickness: 0.7,
    color: black,
  })
  page.drawLine({
    start: { x: mitad + mitad / 2 - firmaLineWidth / 2 - MARGIN / 2, y },
    end: { x: mitad + mitad / 2 + firmaLineWidth / 2 - MARGIN / 2, y },
    thickness: 0.7,
    color: black,
  })
  y -= 11

  const labelUsuario = "Usuario"
  const labelInventariador = "Personal Inventariador"
  const wU = fontBold.widthOfTextAtSize(labelUsuario, 8)
  const wI = fontBold.widthOfTextAtSize(labelInventariador, 8)
  drawText(labelUsuario, mitad / 2 - wU / 2 + MARGIN / 2, y, fontBold, 8)
  drawText(
    labelInventariador,
    mitad + mitad / 2 - wI / 2 - MARGIN / 2,
    y,
    fontBold,
    8
  )

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
