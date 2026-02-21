import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { buscarBienesPorDependenciaPaginado } from "@/lib/siga"
import { prisma } from "@/lib/prisma"

// GET: Listar bienes SIGA por centro de costo con estado de verificación
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
    const centroCosto = searchParams.get("centroCosto")
    const sesionId = searchParams.get("sesionId")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    if (!centroCosto) {
      return NextResponse.json(
        { error: "centroCosto es requerido" },
        { status: 400 }
      )
    }

    const { bienes, total } = await buscarBienesPorDependenciaPaginado(
      centroCosto,
      page,
      pageSize
    )

    // Si hay sesionId, cruzar con verificaciones de PostgreSQL
    if (sesionId) {
      const codigosPatrimoniales = bienes.map((b) => b.codigo_patrimonial)

      const verificaciones = await prisma.verificacionBien.findMany({
        where: {
          sesionId,
          codigoPatrimonial: { in: codigosPatrimoniales },
        },
        select: {
          codigoPatrimonial: true,
          resultado: true,
        },
      })

      const verificacionMap = new Map(
        verificaciones.map((v) => [v.codigoPatrimonial, v.resultado])
      )

      const bienesConEstado = bienes.map((bien) => ({
        ...bien,
        verificado: verificacionMap.has(bien.codigo_patrimonial),
        resultado_verificacion: verificacionMap.get(bien.codigo_patrimonial) || null,
      }))

      return NextResponse.json({
        bienes: bienesConEstado,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      })
    }

    return NextResponse.json({
      bienes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("Error al listar bienes SIGA:", error)
    return NextResponse.json(
      { error: "Error al consultar bienes en SIGA" },
      { status: 500 }
    )
  }
}
