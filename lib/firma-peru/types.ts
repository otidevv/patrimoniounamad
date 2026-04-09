/**
 * Tipos para la integración con Firma Perú (PCM)
 */

export interface FirmaPeruConfig {
  signatureFormat: "PAdES" | "XAdES" | "CAdES"
  signatureLevel: "B" | "T" | "LT" | "LTA"
  signaturePackaging: "enveloped" | "enveloping" | "detached"
  documentToSign: string
  certificateFilter: string
  webTsa: string
  userTsa: string
  passwordTsa: string
  theme: "claro" | "oscuro"
  visiblePosition: boolean
  contactInfo: string
  signatureReason: string
  bachtOperation: boolean
  oneByOne: boolean
  signatureStyle: number
  imageToStamp: string
  stampTextSize: number
  stampWordWrap: number
  role: string
  stampPage: string
  positionx: string
  positiony: string
  uploadDocumentSigned: string
  certificationSignature: boolean
  token: string
}

export interface FirmaPeruParams {
  param_url: string
  param_token: string
  document_extension: string
}

export interface FirmaLoteRequest {
  archivo_ids: string[]
  archivo_rutas: string[]
  motivo: 1 | 2
  apariencia: 1 | 2
  nombre_lote: string
}

export interface LoteParams {
  archivo_ids: string[]
  archivo_rutas: string[]
  motivo: number
  apariencia: number
  nombre_lote: string
  fecha: string
  codigo_lote?: string
}

export const MOTIVOS_FIRMA = { AUTOR: 1, VOBO: 2 } as const
export const MOTIVOS_FIRMA_TEXT: Record<number, string> = {
  1: "Soy el autor del documento",
  2: "Doy V° B°",
}
export const APARIENCIAS_FIRMA = { HORIZONTAL: 1, VERTICAL: 2 } as const
export const FIRMA_PERU_PORT = 48596
export const FIRMA_PERU_STATIC_TOKEN = "1626476967"
