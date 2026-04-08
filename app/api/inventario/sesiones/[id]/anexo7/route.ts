import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buscarBienesPorEmpleadoFinal } from "@/lib/siga"
import ExcelJS from "exceljs"

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
    const empleadoFinal = searchParams.get("empleadoFinal")
    const dniResponsable = searchParams.get("dniResponsable")

    if (!empleadoFinal && !dniResponsable) {
      return NextResponse.json(
        { error: "Se requiere empleadoFinal o dniResponsable" },
        { status: 400 }
      )
    }

    // Obtener sesión con participantes
    const sesion = await prisma.sesionInventario.findUnique({
      where: { id },
      include: {
        dependencia: { select: { nombre: true, siglas: true } },
        sede: { select: { nombre: true } },
        responsable: { select: { nombre: true, apellidos: true } },
        participantes: {
          where: { activo: true },
          include: {
            usuario: { select: { nombre: true, apellidos: true } },
          },
        },
      },
    })

    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    // Participantes como inventariadores
    const inventariadores = sesion.participantes
      .filter((p) => p.rol === "VERIFICADOR" || p.rol === "RESPONSABLE")
      .map((p) => `${p.usuario.apellidos} ${p.usuario.nombre}`.toUpperCase())

    // Dos modos: desde SIGA (empleadoFinal) o desde verificaciones (dniResponsable)
    let datosFilas: Array<{
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
    }> = []
    let nombreUsuario = ""
    let nombreDependencia = ""
    let ubicacionFisica = ""

    if (dniResponsable) {
      // Modo verificaciones: generar desde datos guardados en la BD
      const verificaciones = await prisma.verificacionBien.findMany({
        where: {
          sesionId: id,
          dniResponsableActual: dniResponsable,
        },
        orderBy: { fechaVerificacion: "asc" },
      })

      if (verificaciones.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron bienes verificados para esta persona" },
          { status: 404 }
        )
      }

      const primera = verificaciones[0]
      nombreUsuario = [primera.nombresResponsableActual, primera.apellidosResponsableActual]
        .filter(Boolean).join(" ") || dniResponsable
      nombreDependencia = sesion.sigaNombreDependencia || sesion.dependencia?.nombre || primera.dependenciaSiga || ""
      ubicacionFisica = primera.ubicacionSiga || sesion.ubicacionFisica || ""

      datosFilas = verificaciones.map((v) => {
        // Usar situación guardada, o derivar del resultado como fallback
        let situacion = v.situacion || ""
        if (!situacion) {
          if (v.resultado === "ENCONTRADO" || v.resultado === "REUBICADO") {
            situacion = "U"
          } else if (v.resultado === "NO_ENCONTRADO") {
            situacion = "F"
          } else if (v.resultado === "SOBRANTE") {
            situacion = "S"
          }
        }

        const mapEstado: Record<string, string> = {
          BUENO: "BUENO", REGULAR: "REGULAR", MALO: "MALO",
          INOPERATIVO: "MALO", CHATARRA: "CHATARRA",
        }

        return {
          codigo: v.codigoPatrimonial,
          denominacion: v.descripcionSiga || "",
          marca: v.marcaSiga || "SIN MARCA",
          modelo: v.modeloSiga || "",
          tipo: "Sin tipo",
          color: v.colorSiga || "Sin color",
          serie: v.serieSiga || "SIN SERIE",
          dimensiones: v.dimensionesSiga || "Sin medidas",
          otros: v.otrosSiga || "No indica",
          situacion,
          estadoConservacion: v.estadoFisico ? (mapEstado[v.estadoFisico] || v.estadoFisico) : "",
          observacion: v.observaciones || "",
        }
      })
    } else if (empleadoFinal) {
      // Modo SIGA: obtener bienes desde SIGA
      if (!sesion.sigaCentroCosto) {
        return NextResponse.json(
          { error: "Esta sesión no tiene dependencia SIGA asociada" },
          { status: 400 }
        )
      }

      const bienesUsuario = await buscarBienesPorEmpleadoFinal(
        sesion.sigaCentroCosto,
        empleadoFinal
      )

      if (bienesUsuario.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron bienes para este usuario" },
          { status: 404 }
        )
      }

      nombreUsuario = bienesUsuario[0].usuario || empleadoFinal
      nombreDependencia = sesion.sigaNombreDependencia || sesion.dependencia?.nombre || bienesUsuario[0].nombre_depend || ""
      ubicacionFisica = bienesUsuario[0].ubicacion_fisica || sesion.ubicacionFisica || ""

      const codigosPatrimoniales = bienesUsuario.map((b) => b.codigo_patrimonial)
      const verificaciones = await prisma.verificacionBien.findMany({
        where: {
          sesionId: id,
          codigoPatrimonial: { in: codigosPatrimoniales },
        },
        select: {
          codigoPatrimonial: true,
          resultado: true,
          estadoFisico: true,
          situacion: true,
          observaciones: true,
        },
      })

      const verificacionMap = new Map(
        verificaciones.map((v) => [v.codigoPatrimonial, v])
      )

      datosFilas = bienesUsuario.map((bien) => {
        const verif = verificacionMap.get(bien.codigo_patrimonial)
        let situacion = verif?.situacion || ""
        if (!situacion && verif) {
          if (verif.resultado === "ENCONTRADO" || verif.resultado === "REUBICADO") {
            situacion = "U"
          } else if (verif.resultado === "NO_ENCONTRADO") {
            situacion = "F"
          }
        }

        const mapEstado: Record<string, string> = {
          BUENO: "BUENO", REGULAR: "REGULAR", MALO: "MALO",
          INOPERATIVO: "MALO", CHATARRA: "CHATARRA",
        }

        return {
          codigo: bien.codigo_patrimonial || "",
          denominacion: bien.descripcion || "",
          marca: bien.marca || "SIN MARCA",
          modelo: bien.modelo || "",
          tipo: "Sin tipo",
          color: bien.color || bien.caracteristicas?.match(/COLOR:\s*([^/]+)/i)?.[1]?.trim() || "Sin color",
          serie: bien.serie || "SIN SERIE",
          dimensiones: bien.medidas || "Sin medidas",
          otros: bien.observaciones || "No indica",
          situacion,
          estadoConservacion: verif?.estadoFisico ? (mapEstado[verif.estadoFisico] || verif.estadoFisico) : "",
          observacion: verif?.observaciones || "",
        }
      })
    }

    // Generar Excel con ExcelJS
    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet("Anexo 7", {
      pageSetup: {
        paperSize: 9, // A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
      },
    })

    // Definir anchos de columnas (A=1 hasta M=13)
    ws.columns = [
      { width: 8 },   // A: N° DE ORDEN
      { width: 16 },  // B: CÓDIGO PATRIMONIAL
      { width: 28 },  // C: DENOMINACIÓN
      { width: 14 },  // D: MARCA
      { width: 14 },  // E: MODELO
      { width: 12 },  // F: TIPO
      { width: 10 },  // G: COLOR
      { width: 18 },  // H: SERIE
      { width: 16 },  // I: DIMENSIONES
      { width: 14 },  // J: OTROS
      { width: 10 },  // K: SITUACIÓN
      { width: 16 },  // L: ESTADO DE CONSERVACIÓN
      { width: 16 },  // M: OBSERVACIÓN
    ]

    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    }

    const fontBold = (size: number): Partial<ExcelJS.Font> => ({
      bold: true,
      size,
      name: "Calibri",
    })

    const fontNormal = (size: number): Partial<ExcelJS.Font> => ({
      size,
      name: "Calibri",
    })

    // ====== HEADER ======
    // Row 1: ANEXO N°7
    const row1 = ws.getRow(1)
    ws.mergeCells("A1:M1")
    row1.getCell(1).value = "ANEXO N°7"
    row1.getCell(1).font = fontBold(14)
    row1.getCell(1).alignment = { horizontal: "right" }

    // Row 2: FORMATO FICHA...
    ws.mergeCells("A2:M2")
    const row2 = ws.getRow(2)
    row2.getCell(1).value = "FORMATO FICHA DE LEVANTAMIENTO DE INFORMACIÓN"
    row2.getCell(1).font = fontBold(12)
    row2.getCell(1).alignment = { horizontal: "center" }

    // Fecha en zona horaria de Perú
    const fechaPeru = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }))

    // Row 3: INVENTARIO PATRIMONIAL
    ws.mergeCells("A3:M3")
    const row3 = ws.getRow(3)
    const year = sesion.fechaProgramada
      ? new Date(sesion.fechaProgramada).getFullYear()
      : fechaPeru.getFullYear()
    row3.getCell(1).value = `INVENTARIO PATRIMONIAL ${year}`
    row3.getCell(1).font = fontBold(12)
    row3.getCell(1).alignment = { horizontal: "center" }

    // Row 4: ENTIDAD / FECHA
    const row4 = ws.getRow(4)
    row4.getCell(1).value = "ENTIDAD:"
    row4.getCell(1).font = fontBold(9)
    row4.getCell(7).value = "FECHA:"
    row4.getCell(7).font = fontBold(9)
    row4.getCell(8).value = fechaPeru
    row4.getCell(8).numFmt = "DD/MM/YYYY"
    row4.getCell(8).font = fontNormal(9)

    // Row 5: Nombre de la entidad
    const row5 = ws.getRow(5)
    ws.mergeCells("A5:F5")
    row5.getCell(1).value = "UNIVERSIDAD NACIONAL AMAZÓNICA DE MADRE DE DIOS"
    row5.getCell(1).font = fontBold(9)

    // Row 6: USUARIO / PERSONAL INVENTARIADOR
    const row6 = ws.getRow(6)
    row6.getCell(1).value = "USUARIO:"
    row6.getCell(1).font = fontBold(9)
    row6.getCell(7).value = "PERSONAL INVENTARIADOR:"
    row6.getCell(7).font = fontBold(9)

    // Row 7: Nombres del usuario / Inventariador 1
    const row7 = ws.getRow(7)
    row7.getCell(1).value = "NOMBRES Y APELLIDOS:"
    row7.getCell(1).font = fontBold(9)
    ws.mergeCells("C7:F7")
    row7.getCell(3).value = nombreUsuario
    row7.getCell(3).font = fontNormal(9)
    row7.getCell(7).value = "NOMBRES Y APELLIDOS:"
    row7.getCell(7).font = fontBold(9)
    ws.mergeCells("I7:M7")
    row7.getCell(9).value = inventariadores[0] || ""
    row7.getCell(9).font = fontNormal(9)

    // Row 8: DEPENDENCIA / Inventariador 2
    const row8 = ws.getRow(8)
    ws.mergeCells("A8:B8")
    row8.getCell(1).value = "DEPENDENCIA/UNIDAD/OTROS:"
    row8.getCell(1).font = fontBold(9)
    ws.mergeCells("C8:F8")
    row8.getCell(3).value = nombreDependencia
    row8.getCell(3).font = fontNormal(9)
    row8.getCell(7).value = "NOMBRES Y APELLIDOS:"
    row8.getCell(7).font = fontBold(9)
    ws.mergeCells("I8:M8")
    row8.getCell(9).value = inventariadores[1] || ""
    row8.getCell(9).font = fontNormal(9)

    // Row 9: UBICACIÓN FÍSICA / EQUIPO DE TRABAJO
    const row9 = ws.getRow(9)
    ws.mergeCells("A9:B9")
    row9.getCell(1).value = "UBICACIÓN FÍSICA DE LOS BIENES:"
    row9.getCell(1).font = fontBold(9)
    ws.mergeCells("C9:F9")
    row9.getCell(3).value = ubicacionFisica
    row9.getCell(3).font = fontNormal(9)
    row9.getCell(7).value = "EQUIPO DE TRABAJO:"
    row9.getCell(7).font = fontBold(9)
    row9.getCell(9).value = sesion.participantes.length || 1
    row9.getCell(9).font = fontNormal(9)

    // Row 10: vacia
    // Row 11: TIPO DE VERIFICACION
    const row11 = ws.getRow(11)
    ws.mergeCells("A11:M11")
    row11.getCell(1).value = "TIPO DE VERIFICACION: FÍSICA ( X  )    DIGITAL (    )"
    row11.getCell(1).font = fontBold(9)

    // Row 12: vacia

    // ====== TABLE HEADER ======
    // Row 13: N° DE ORDEN + DESCRIPCIÓN (merged)
    const headerRow1 = 13
    const row13 = ws.getRow(headerRow1)
    ws.mergeCells(`A${headerRow1}:A${headerRow1 + 1}`)
    row13.getCell(1).value = "N° DE\nORDEN"
    row13.getCell(1).font = fontBold(8)
    row13.getCell(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    row13.getCell(1).border = borderThin

    ws.mergeCells(`B${headerRow1}:M${headerRow1}`)
    row13.getCell(2).value = "DESCRIPCIÓN"
    row13.getCell(2).font = fontBold(8)
    row13.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
    row13.getCell(2).border = borderThin

    // Row 14: Sub-headers
    const headerRow2 = 14
    const row14 = ws.getRow(headerRow2)
    const subHeaders = [
      "",
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
      "ESTADO DE\nCONSERVACIÓN (2)",
      "OBSERVACIÓN",
    ]

    subHeaders.forEach((header, i) => {
      const cell = row14.getCell(i + 1)
      cell.value = header
      cell.font = fontBold(7)
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      cell.border = borderThin
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9E2F3" },
      }
    })
    row14.height = 28

    // Border for merged N° DE ORDEN on row 14
    ws.getRow(headerRow1 + 1).getCell(1).border = borderThin

    // ====== DATA ROWS ======
    const dataStartRow = 15
    datosFilas.forEach((fila, index) => {
      const rowNum = dataStartRow + index
      const row = ws.getRow(rowNum)

      const values = [
        index + 1,
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

      values.forEach((val, i) => {
        const cell = row.getCell(i + 1)
        cell.value = val
        cell.font = fontNormal(8)
        cell.alignment = { vertical: "middle", wrapText: true }
        cell.border = borderThin
      })

      // Center N° de orden, Situación y Estado
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
      row.getCell(11).alignment = { horizontal: "center", vertical: "middle" }
      row.getCell(12).alignment = { horizontal: "center", vertical: "middle" }
    })

    // ====== FOOTER ======
    const footerStart = dataStartRow + datosFilas.length + 2

    // Leyendas
    const rowLeyenda1 = ws.getRow(footerStart)
    ws.mergeCells(`A${footerStart}:M${footerStart}`)
    rowLeyenda1.getCell(1).value = "(1) Uso (U), Desuso (D)"
    rowLeyenda1.getCell(1).font = fontNormal(8)

    const rowLeyenda2 = ws.getRow(footerStart + 1)
    ws.mergeCells(`A${footerStart + 1}:M${footerStart + 1}`)
    rowLeyenda2.getCell(1).value =
      "(2) El estado es consignado en base a la siguiente escala: Bueno, Regular, Malo, Chatarra y RAEE. En caso de semovientes, utilizar escala de acuerdo a su naturaleza."
    rowLeyenda2.getCell(1).font = fontNormal(8)

    // Consideraciones
    const considStart = footerStart + 3
    const rowConsid = ws.getRow(considStart)
    ws.mergeCells(`A${considStart}:M${considStart}`)
    rowConsid.getCell(1).value = "CONSIDERACIONES:"
    rowConsid.getCell(1).font = fontBold(8)

    const consideraciones = [
      "El usuario declara haber mostrado todos los bienes muebles que se encuentran bajo su responsabilidad y no contar con más bienes muebles materia de inventario.",
      "El usuario es responsable de la permanencia y conservación de cada uno de los bienes muebles descritos, se recomienda tomar las precauciones del caso para evitar sustracción, deterioros, etc.",
      "Cualquier necesidad de traslado del bien mueble dentro o fuera del local de la entidad u organización de la entidad, es previamente comunicado al encargado de la UBP.",
    ]

    consideraciones.forEach((texto, i) => {
      const rowC = ws.getRow(considStart + 1 + i)
      ws.mergeCells(`A${considStart + 1 + i}:M${considStart + 1 + i}`)
      rowC.getCell(1).value = `Ø  ${texto}`
      rowC.getCell(1).font = fontNormal(8)
      rowC.getCell(1).alignment = { wrapText: true }
    })

    // Firmas
    const firmaRow = considStart + 6
    const rowFirma = ws.getRow(firmaRow)
    ws.mergeCells(`A${firmaRow}:F${firmaRow}`)
    rowFirma.getCell(1).value = "___________________________________"
    rowFirma.getCell(1).alignment = { horizontal: "center" }

    ws.mergeCells(`G${firmaRow}:M${firmaRow}`)
    rowFirma.getCell(7).value = "___________________________________"
    rowFirma.getCell(7).alignment = { horizontal: "center" }

    const labelRow = firmaRow + 1
    const rowLabel = ws.getRow(labelRow)
    ws.mergeCells(`A${labelRow}:F${labelRow}`)
    rowLabel.getCell(1).value = "Usuario"
    rowLabel.getCell(1).font = fontBold(9)
    rowLabel.getCell(1).alignment = { horizontal: "center" }

    ws.mergeCells(`G${labelRow}:M${labelRow}`)
    rowLabel.getCell(7).value = "Personal Inventariador"
    rowLabel.getCell(7).font = fontBold(9)
    rowLabel.getCell(7).alignment = { horizontal: "center" }

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Nombre del archivo
    const nombreLimpio = nombreUsuario
      .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
    const fileName = `Anexo7_${nombreLimpio}_${sesion.codigo}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error al generar Anexo 7:", error)
    return NextResponse.json(
      { error: "Error al generar el reporte" },
      { status: 500 }
    )
  }
}
