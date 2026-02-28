// Tipos para Zebra Browser Print
export interface ZebraDevice {
  deviceType: string
  uid: string
  provider: string
  name: string
  connection: string
  version: string
  manufacturer: string
}

export interface LabelData {
  codigoPatrimonial: string
  descripcion: string
}

const BROWSER_PRINT_URL = "http://localhost:9100"
const LOGO_SIZE = 22 // dots (22x22 para coincidir con la linea de UNAMAD)

/**
 * Obtiene las impresoras Zebra disponibles via Zebra Browser Print
 */
export async function getAvailablePrinters(): Promise<ZebraDevice[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${BROWSER_PRINT_URL}/available`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) return []

    const data = await response.json()

    // Browser Print retorna un objeto con printer como array o un solo device
    if (data.printer) {
      return Array.isArray(data.printer) ? data.printer : [data.printer]
    }

    return []
  } catch {
    return []
  }
}

/**
 * Envia datos ZPL a una impresora Zebra
 */
export async function sendZplToPrinter(
  device: ZebraDevice,
  zplData: string
): Promise<void> {
  const response = await fetch(`${BROWSER_PRINT_URL}/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device, data: zplData }),
  })

  if (!response.ok) {
    throw new Error(`Error al enviar a impresora: ${response.statusText}`)
  }
}

/**
 * Convierte una imagen PNG/JPG a formato grafico ZPL (^GF)
 * Usa Canvas API del navegador para leer pixels y convertir a monocromo
 */
export function convertImageToZplGraphic(
  imageSrc: string,
  size: number = LOGO_SIZE
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")!

      // Fondo blanco
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, size, size)

      // Dibujar imagen escalada
      ctx.drawImage(img, 0, 0, size, size)

      const imageData = ctx.getImageData(0, 0, size, size)
      const pixels = imageData.data

      // Convertir a bitmap monocromo para ZPL
      const bytesPerRow = Math.ceil(size / 8)
      let hexData = ""

      for (let y = 0; y < size; y++) {
        for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
          let byte = 0
          for (let bit = 0; bit < 8; bit++) {
            const x = byteIdx * 8 + bit
            if (x < size) {
              const pixelIdx = (y * size + x) * 4
              const r = pixels[pixelIdx]
              const g = pixels[pixelIdx + 1]
              const b = pixels[pixelIdx + 2]
              const gray = (r + g + b) / 3
              // ZPL ^GF: 1 = negro, 0 = blanco
              if (gray < 128) {
                byte |= (1 << (7 - bit))
              }
            }
          }
          hexData += byte.toString(16).padStart(2, "0").toUpperCase()
        }
      }

      const totalBytes = bytesPerRow * size
      // ^GFA,b,c,d,data — b=total bytes, c=total bytes (sin compresion), d=bytes por fila
      resolve(`^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}`)
    }
    img.onerror = () => reject(new Error("No se pudo cargar la imagen del logo"))
    img.src = imageSrc
  })
}

/**
 * Trunca texto a un maximo de caracteres, cortando en palabra si es posible
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const truncated = text.substring(0, maxChars)
  const lastSpace = truncated.lastIndexOf(" ")
  return lastSpace > maxChars * 0.6 ? truncated.substring(0, lastSpace) : truncated
}

/**
 * Genera ZPL para una etiqueta de 25mm alto x 50mm ancho
 * 203 DPI: 200 dots alto x 400 dots ancho
 *
 * Diseño termico: TODO el texto va ARRIBA del barcode (cabezal frio = nitido).
 * El barcode es lo ultimo denso que se imprime. El footer va 38 dots despues
 * del barcode para dar maximo enfriamiento al cabezal.
 *
 * Layout:
 *   y=4:   UNAMAD (font 22)
 *   y=28:  CODIFICACION SIGA (font 15)
 *   y=46:  Descripcion (font 15)
 *   y=64:  Numero codigo patrimonial (font 15) — ARRIBA del barcode
 *   y=82:  Code 128 barcode (55 dots alto, sin interpretacion) — termina y=137
 *   y=175: UNIDAD DE BIENES PATRIMONIALES (font 14) — 38 dots gap de enfriamiento
 *   Logo al final del ZPL (x=372, y=2)
 */
export function generateLabelZpl(data: LabelData, logoGf?: string): string {
  const { codigoPatrimonial, descripcion } = data

  const desc = truncateText(descripcion.toUpperCase(), 35)

  const zpl = [
    "^XA",
    "^CI28",
    "^MTD",      // Modo térmico directo (sin ribbon)
    "^PW400",
    "^LL200",
    "^PR2,2,2",  // 2 IPS: buen balance calidad/calor

    // UNAMAD centrado
    "^FO0,4^A0N,22,22^FB400,1,0,C^FDU N A M A D^FS",

    // CODIFICACION SIGA
    "^FO0,28^A0N,15,15^FB400,1,0,C^FDCODIFICACION SIGA^FS",

    // Descripcion (cabezal frio = nitido)
    `^FO0,46^A0N,15,15^FB400,1,0,C^FD${desc}^FS`,

    // Numero del codigo ARRIBA del barcode (zona fria, impresion nitida)
    `^FO0,64^A0N,15,15^FB400,1,0,C^FD${codigoPatrimonial}^FS`,

    // Codigo de barras Code 128 — ultimo elemento denso
    `^FO65,82^BY2,3,55^BCN,55,N,N,N^FD${codigoPatrimonial}^FS`,

    // Footer — 38 dots de gap tras barcode (maximo enfriamiento)
    "^FO0,175^A0N,14,14^FB400,1,0,C^FDUNIDAD DE BIENES PATRIMONIALES^FS",

    // Logo al final del ZPL
    ...(logoGf ? [`^FO372,2${logoGf}^FS`] : []),

    "^XZ",
  ].join("\n")

  return zpl
}

/**
 * Genera ZPL para un lote de etiquetas.
 * Incluye una etiqueta en blanco al inicio para calentar el cabezal térmico.
 */
export function generateBatchZpl(items: LabelData[], logoGf?: string): string {
  const blankLabel = "^XA^XZ"
  const labels = items.map((item) => generateLabelZpl(item, logoGf)).join("\n")
  return `${blankLabel}\n${labels}`
}
