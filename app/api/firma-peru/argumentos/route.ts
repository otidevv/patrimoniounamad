import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  MOTIVOS_FIRMA_TEXT,
  type FirmaLoteRequest,
  type FirmaPeruConfig,
  type LoteParams,
} from "@/lib/firma-peru"
import { getFirmaPeruToken } from "@/lib/firma-peru/token"
import {
  generateTokenLote,
  generateLoteId,
  saveLoteParams,
  getLoteParams,
  updateLoteParams,
} from "@/lib/firma-peru/storage"

async function handleGetArgumentos(tokenLote: string | null): Promise<NextResponse> {
  try {
    if (!tokenLote) {
      return new NextResponse(
        Buffer.from(JSON.stringify({ error: "No se encontró el token del lote" })).toString("base64"),
        { headers: { "Content-Type": "text/plain" } }
      )
    }

    const loteParams = getLoteParams(tokenLote)
    if (!loteParams) {
      return new NextResponse(
        Buffer.from(JSON.stringify({ error: "No se encontró información del lote" })).toString("base64"),
        { headers: { "Content-Type": "text/plain" } }
      )
    }

    const token = await getFirmaPeruToken()
    if (!token) {
      return new NextResponse(
        Buffer.from(JSON.stringify({ error: "No se pudo obtener el token de autenticación" })).toString("base64"),
        { headers: { "Content-Type": "text/plain" } }
      )
    }

    let codigoLote = loteParams.codigo_lote
    if (!codigoLote) {
      codigoLote = generateLoteId()
      updateLoteParams(tokenLote, { codigo_lote: codigoLote })
    }

    const motivoText = MOTIVOS_FIRMA_TEXT[loteParams.motivo] || "Soy el autor del documento"
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const firmaConfig: FirmaPeruConfig = {
      signatureFormat: "PAdES",
      signatureLevel: "B",
      signaturePackaging: "enveloped",
      documentToSign: `${baseUrl}/api/firma-peru/lote/${codigoLote}/descargar`,
      certificateFilter: ".*",
      webTsa: "",
      userTsa: "",
      passwordTsa: "",
      theme: "claro",
      visiblePosition: true,
      contactInfo: "",
      signatureReason: motivoText,
      bachtOperation: true,
      oneByOne: false,
      signatureStyle: loteParams.apariencia,
      imageToStamp: loteParams.apariencia === 1
        ? `${baseUrl}/images/firma_horizontal.png`
        : `${baseUrl}/images/firma_vertical.png`,
      stampTextSize: 14,
      stampWordWrap: 37,
      role: "",
      stampPage: "1",
      positionx: "20",
      positiony: "20",
      uploadDocumentSigned: `${baseUrl}/api/firma-peru/lote/${codigoLote}/cargar`,
      certificationSignature: false,
      token,
    }

    return new NextResponse(
      Buffer.from(JSON.stringify(firmaConfig)).toString("base64"),
      { headers: { "Content-Type": "text/plain" } }
    )
  } catch (error) {
    console.error("[Firma Perú] Error en handleGetArgumentos:", error)
    return new NextResponse(
      Buffer.from(JSON.stringify({ error: "Error interno del servidor" })).toString("base64"),
      { headers: { "Content-Type": "text/plain" } }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""

    // Si viene del cliente Firma Perú (form-urlencoded)
    if (!contentType.includes("application/json")) {
      const { searchParams } = new URL(request.url)
      return handleGetArgumentos(searchParams.get("token_lote"))
    }

    // Solicitud del frontend
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body: FirmaLoteRequest = await request.json()

    if (!body.archivo_ids?.length) {
      return NextResponse.json({ error: "archivo_ids es requerido" }, { status: 400 })
    }

    const tokenLote = generateTokenLote()
    const params: LoteParams = {
      archivo_ids: body.archivo_ids,
      archivo_rutas: body.archivo_rutas || [],
      motivo: body.motivo,
      apariencia: body.apariencia,
      nombre_lote: body.nombre_lote,
      fecha: new Date().toISOString(),
    }

    saveLoteParams(tokenLote, params)
    return NextResponse.json({ success: true, token_lote: tokenLote })
  } catch (error) {
    console.error("[Firma Perú] Error en POST /argumentos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return handleGetArgumentos(searchParams.get("token_lote"))
}
