import { generateLabelZpl, generateBatchZpl } from "@/lib/zebra-printer"

describe("generateLabelZpl() - generación de etiqueta ZPL", () => {
  const data = { codigoPatrimonial: "740895200001", descripcion: "Laptop HP" }

  it("inicia con ^XA y termina con ^XZ", () => {
    const zpl = generateLabelZpl(data)
    expect(zpl.startsWith("^XA")).toBe(true)
    expect(zpl.trimEnd().endsWith("^XZ")).toBe(true)
  })

  it("incluye el código patrimonial en el texto y en el código de barras", () => {
    const zpl = generateLabelZpl(data)
    // Debe aparecer en el campo de texto y en el comando de barcode (^BCN)
    expect(zpl).toContain(data.codigoPatrimonial)
    expect(zpl).toContain(`^BCN,55,N,N,N^FD${data.codigoPatrimonial}^FS`)
  })

  it("pone la descripción en mayúsculas", () => {
    const zpl = generateLabelZpl(data)
    expect(zpl).toContain("LAPTOP HP")
  })

  it("trunca descripciones largas (máx 35 caracteres)", () => {
    const larga = {
      codigoPatrimonial: "1",
      descripcion: "Equipo de cómputo portátil de alto rendimiento marca Lenovo",
    }
    const zpl = generateLabelZpl(larga)
    // Extrae el contenido del campo de descripción (y=46)
    const match = zpl.match(/\^FO0,46\^A0N,15,15\^FB400,1,0,C\^FD(.*?)\^FS/)
    expect(match).not.toBeNull()
    expect(match![1].length).toBeLessThanOrEqual(35)
  })

  it("incluye el logo cuando se proporciona el gráfico GF", () => {
    const zpl = generateLabelZpl(data, "^GFA,10,10,2,FFFF")
    expect(zpl).toContain("^FO372,2^GFA,10,10,2,FFFF^FS")
  })

  it("omite el logo cuando no se proporciona", () => {
    const zpl = generateLabelZpl(data)
    expect(zpl).not.toContain("^GFA")
  })
})

describe("generateBatchZpl() - lote de etiquetas", () => {
  const items = [
    { codigoPatrimonial: "001", descripcion: "Silla" },
    { codigoPatrimonial: "002", descripcion: "Mesa" },
  ]

  it("agrega una etiqueta en blanco al inicio para calentar el cabezal", () => {
    const zpl = generateBatchZpl(items)
    expect(zpl.startsWith("^XA^XZ")).toBe(true)
  })

  it("genera una etiqueta por cada bien", () => {
    const zpl = generateBatchZpl(items)
    // Cuenta los inicios de etiqueta reales (^XA seguido de salto de línea)
    const aperturas = zpl.match(/\^XA\n/g) ?? []
    expect(aperturas.length).toBe(items.length)
    expect(zpl).toContain("001")
    expect(zpl).toContain("002")
  })

  it("maneja un lote vacío devolviendo solo la etiqueta en blanco", () => {
    const zpl = generateBatchZpl([])
    expect(zpl.trim()).toBe("^XA^XZ")
  })
})
