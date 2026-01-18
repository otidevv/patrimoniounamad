import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buscarBienPorCodigo } from "@/lib/siga"

// GET: Listar verificaciones de una sesión
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
    const sesionId = searchParams.get("sesionId")
    const resultado = searchParams.get("resultado")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    if (!sesionId) {
      return NextResponse.json(
        { error: "Se requiere el ID de la sesión" },
        { status: 400 }
      )
    }

    // Construir filtros
    const where: Record<string, unknown> = { sesionId }

    if (resultado) {
      where.resultado = resultado
    }

    const [verificaciones, total] = await Promise.all([
      prisma.verificacionBien.findMany({
        where,
        include: {
          verificador: {
            select: { id: true, nombre: true, apellidos: true },
          },
        },
        orderBy: { fechaVerificacion: "desc" },
        skip,
        take: limit,
      }),
      prisma.verificacionBien.count({ where }),
    ])

    return NextResponse.json({
      verificaciones,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    console.error("Error al listar verificaciones:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST: Registrar verificación de un bien
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      sesionId,
      codigoPatrimonial,
      resultado,
      estadoFisico,
      ubicacionReal,
      responsableReal,
      observaciones,
      dispositivoTipo,
      dispositivoInfo,
    } = body

    if (!sesionId || !codigoPatrimonial) {
      return NextResponse.json(
        { error: "Se requiere sesión y código patrimonial" },
        { status: 400 }
      )
    }

    // Verificar que la sesión existe y está en proceso
    const sesion = await prisma.sesionInventario.findUnique({
      where: { id: sesionId },
    })

    if (!sesion) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      )
    }

    if (sesion.estado !== "EN_PROCESO") {
      return NextResponse.json(
        { error: "La sesión no está en proceso" },
        { status: 400 }
      )
    }

    // Verificar si ya existe una verificación para este código en esta sesión
    const verificacionExistente = await prisma.verificacionBien.findUnique({
      where: {
        sesionId_codigoPatrimonial: {
          sesionId,
          codigoPatrimonial,
        },
      },
    })

    if (verificacionExistente) {
      return NextResponse.json(
        {
          error: "Este bien ya fue verificado en esta sesión",
          verificacionExistente,
        },
        { status: 409 }
      )
    }

    // Buscar información del bien en SIGA
    let datosSiga = null
    let resultadoFinal = resultado || "ENCONTRADO"

    try {
      datosSiga = await buscarBienPorCodigo(codigoPatrimonial)

      if (!datosSiga) {
        // Si no se encuentra en SIGA, es un posible sobrante
        resultadoFinal = "SOBRANTE"
      }
    } catch (error) {
      console.error("Error al consultar SIGA:", error)
      // Continuar sin datos de SIGA
    }

    // Crear la verificación
    const verificacion = await prisma.verificacionBien.create({
      data: {
        sesionId,
        codigoPatrimonial,
        // Datos de SIGA (si se encontró)
        descripcionSiga: datosSiga?.descripcion || null,
        marcaSiga: datosSiga?.marca || null,
        modeloSiga: datosSiga?.modelo || null,
        serieSiga: datosSiga?.serie || null,
        colorSiga: datosSiga?.color || null,
        responsableSiga: datosSiga?.responsable || null,
        usuarioSiga: datosSiga?.usuario || null,
        dependenciaSiga: datosSiga?.nombre_depend || null,
        ubicacionSiga: datosSiga?.ubicacion_fisica || null,
        valorSiga: datosSiga?.valor_neto || null,
        // Resultado de la verificación
        resultado: resultadoFinal,
        estadoFisico: estadoFisico || null,
        ubicacionReal: ubicacionReal || null,
        responsableReal: responsableReal || null,
        observaciones: observaciones || null,
        // Verificador
        verificadorId: session.id,
        // Dispositivo
        dispositivoTipo: dispositivoTipo || "MANUAL",
        dispositivoInfo: dispositivoInfo || null,
      },
      include: {
        verificador: {
          select: { id: true, nombre: true, apellidos: true },
        },
      },
    })

    // Actualizar estadísticas de la sesión
    const stats = await prisma.verificacionBien.groupBy({
      by: ["resultado"],
      where: { sesionId },
      _count: true,
    })

    const statsMap: Record<string, number> = {}
    stats.forEach((s) => {
      statsMap[s.resultado] = s._count
    })

    await prisma.sesionInventario.update({
      where: { id: sesionId },
      data: {
        totalVerificados: Object.values(statsMap).reduce((a, b) => a + b, 0),
        totalEncontrados: statsMap["ENCONTRADO"] || 0,
        totalReubicados: statsMap["REUBICADO"] || 0,
        totalNoEncontrados: statsMap["NO_ENCONTRADO"] || 0,
        totalSobrantes: statsMap["SOBRANTE"] || 0,
      },
    })

    return NextResponse.json({
      verificacion,
      datosSiga,
      mensaje: datosSiga
        ? "Bien verificado correctamente"
        : "Bien no encontrado en SIGA - registrado como posible sobrante",
    }, { status: 201 })
  } catch (error) {
    console.error("Error al registrar verificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
