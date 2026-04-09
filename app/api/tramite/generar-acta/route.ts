import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { generarActaEntregaPDF } from "@/lib/generar-acta-entrega"

// POST: Generar Acta de Entrega de Bien + crear transferencias + crear documento tramite
export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const {
      tipoDocumentoId,
      correlativo,
      anio,
      destinatarioId, // ID del usuario destinatario
      dependenciaDestinoId, // ID de la dependencia destino
      verificacionIds, // Array de IDs de bienes verificados a transferir
      motivo,
      estadoConservacion,
    } = body

    // Validaciones
    if (!tipoDocumentoId || !correlativo || !destinatarioId || !dependenciaDestinoId) {
      return NextResponse.json(
        { message: "Tipo de documento, correlativo, destinatario y dependencia son requeridos" },
        { status: 400 }
      )
    }

    if (!verificacionIds?.length) {
      return NextResponse.json(
        { message: "Debe seleccionar al menos un bien para transferir" },
        { status: 400 }
      )
    }

    // Obtener datos del remitente (quien entrega)
    const remitente = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: {
        dependencia: true,
      },
    })

    if (!remitente?.dependencia) {
      return NextResponse.json(
        { message: "El usuario no tiene dependencia asignada" },
        { status: 400 }
      )
    }

    // Obtener datos del destinatario (quien recibe)
    const destinatario = await prisma.usuario.findUnique({
      where: { id: destinatarioId },
      include: {
        dependencia: true,
      },
    })

    if (!destinatario) {
      return NextResponse.json(
        { message: "Destinatario no encontrado" },
        { status: 404 }
      )
    }

    // Obtener dependencia destino
    const dependenciaDestino = await prisma.dependencia.findUnique({
      where: { id: dependenciaDestinoId },
    })

    if (!dependenciaDestino) {
      return NextResponse.json(
        { message: "Dependencia destino no encontrada" },
        { status: 404 }
      )
    }

    // Obtener los bienes verificados
    const verificaciones = await prisma.verificacionBien.findMany({
      where: {
        id: { in: verificacionIds },
      },
      include: {
        asignacion: { select: { estado: true } },
      },
    })

    if (verificaciones.length === 0) {
      return NextResponse.json(
        { message: "No se encontraron los bienes seleccionados" },
        { status: 404 }
      )
    }

    // Validar que no haya transferencias pendientes
    for (const v of verificaciones) {
      const pendiente = await prisma.transferenciaBien.findFirst({
        where: { verificacionId: v.id, estado: "PENDIENTE" },
      })
      if (pendiente) {
        return NextResponse.json(
          { message: `El bien ${v.codigoPatrimonial} ya tiene una transferencia pendiente` },
          { status: 409 }
        )
      }
    }

    // Verificar correlativo unico
    const yearValue = anio || new Date().getFullYear()
    const existente = await prisma.documentoTramite.findFirst({
      where: { tipoDocumentoId, correlativo, anio: yearValue },
    })
    if (existente) {
      return NextResponse.json(
        { message: "Ya existe un documento con ese correlativo para este tipo y año" },
        { status: 400 }
      )
    }

    // Preparar datos para el PDF
    const bienesPDF = verificaciones.map((v) => ({
      equipo: v.descripcionSiga || v.codigoPatrimonial,
      marca: v.marcaSiga || "S/N",
      modelo: v.modeloSiga || "S/N",
      serie: v.serieSiga || "S/N",
      patrimonio: v.codigoPatrimonial || "S/N",
    }))

    const nombreRemitente = `${remitente.nombre} ${remitente.apellidos}`.trim()
    const nombreDestinatario = `${destinatario.nombre} ${destinatario.apellidos}`.trim()

    // Generar el PDF
    const pdfBuffer = await generarActaEntregaPDF({
      numero: correlativo,
      anio: yearValue,
      siglasOrigen: remitente.dependencia.siglas || remitente.dependencia.codigo,
      nombreEntrega: nombreRemitente,
      cargoEntrega: remitente.cargo || "Responsable",
      dependenciaEntrega: remitente.dependencia.nombre,
      nombreRecibe: nombreDestinatario,
      cargoRecibe: destinatario.cargo || "Responsable",
      dependenciaRecibe: dependenciaDestino.nombre,
      bienes: bienesPDF,
      estadoConservacion: estadoConservacion || "bueno",
    })

    // Guardar el PDF en disco
    const now = new Date()
    const mes = String(now.getMonth() + 1).padStart(2, "0")
    const yearStr = String(yearValue)
    const sanitize = (str: string) => str.replace(/[\/\\:*?"<>|]/g, "-")
    const safeDependencia = sanitize(remitente.dependencia.siglas || remitente.dependencia.codigo)

    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      "tramite",
      yearStr,
      mes,
      safeDependencia
    )

    await mkdir(uploadDir, { recursive: true })

    const fileName = `ACTA-ENT-${sanitize(correlativo)}-${yearStr}.pdf`
    const filePath = path.join(uploadDir, fileName)
    await writeFile(filePath, pdfBuffer)

    const relativePath = `/api/uploads/tramite/${yearStr}/${mes}/${safeDependencia}/${fileName}`

    // Crear el documento de tramite
    const asunto = `Acta de Entrega de Bien - Transferencia de ${verificaciones.length} bien(es) a ${nombreDestinatario}`

    const documento = await prisma.documentoTramite.create({
      data: {
        tipoDocumentoId,
        correlativo,
        anio: yearValue,
        asunto,
        contenido: motivo || null,
        folios: 1,
        prioridad: "NORMAL",
        estado: "BORRADOR",
        tipoFirma: "DIGITAL",
        dependenciaOrigenId: remitente.dependencia.id,
        remitenteId: user.id,
        destinos: {
          create: {
            dependenciaDestinoId: dependenciaDestinoId,
            destinatarioId: destinatarioId,
            esCopia: false,
          },
        },
        archivosAdjuntos: {
          create: {
            nombre: fileName,
            url: relativePath,
            tipo: "application/pdf",
            tamanio: pdfBuffer.length,
          },
        },
        historial: {
          create: {
            accion: "CREADO",
            usuarioId: user.id,
            dependenciaId: remitente.dependencia.id,
            descripcion: "Acta de entrega de bien generada — pendiente de firma digital",
            estadoNuevo: "BORRADOR",
          },
        },
      },
      include: {
        tipoDocumento: true,
        dependenciaOrigen: true,
        destinos: {
          include: { dependenciaDestino: true },
        },
      },
    })

    // Crear las transferencias de bienes
    const transferencias = []
    for (const v of verificaciones) {
      const nombreRemitenteV = [v.nombresResponsableActual, v.apellidosResponsableActual]
        .filter(Boolean).join(" ") || nombreRemitente

      const transferencia = await prisma.transferenciaBien.create({
        data: {
          verificacionId: v.id,
          codigoPatrimonial: v.codigoPatrimonial,
          descripcionBien: v.descripcionSiga,
          remitenteId: user.id,
          dniRemitente: v.dniResponsableActual || remitente.numeroDocumento || "",
          nombreRemitente: nombreRemitenteV,
          destinatarioId: destinatarioId,
          dniDestinatario: destinatario.numeroDocumento || "",
          nombreDestinatario: nombreDestinatario,
          documentoActaId: documento.id,
          motivo: motivo || `Transferencia mediante Acta N° ${correlativo}-${yearValue}-${safeDependencia}`,
        },
      })
      transferencias.push(transferencia)
    }

    return NextResponse.json({
      documento,
      transferencias,
      pdfUrl: relativePath,
    }, { status: 201 })
  } catch (error) {
    console.error("Error al generar acta de entrega:", error)
    return NextResponse.json(
      { message: "Error al generar el acta de entrega" },
      { status: 500 }
    )
  }
}
