/**
 * Almacenamiento temporal para lotes de firma
 */

import { LoteParams } from "./types"
import fs from "fs"
import path from "path"

const TEMP_DIR = path.join(process.cwd(), "tmp", "firma-peru")

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }
}

export function generateLoteId(): string {
  return `lote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function generateTokenLote(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function saveLoteParams(tokenLote: string, params: LoteParams): void {
  ensureTempDir()
  fs.writeFileSync(path.join(TEMP_DIR, `${tokenLote}.json`), JSON.stringify(params, null, 2))
}

export function getLoteParams(tokenLote: string): LoteParams | null {
  const filePath = path.join(TEMP_DIR, `${tokenLote}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as LoteParams
  } catch {
    return null
  }
}

export function updateLoteParams(tokenLote: string, params: Partial<LoteParams>): boolean {
  const current = getLoteParams(tokenLote)
  if (!current) return false
  saveLoteParams(tokenLote, { ...current, ...params })
  return true
}

export function findLoteByCode(codigoLote: string): { tokenLote: string; params: LoteParams } | null {
  ensureTempDir()
  const files = fs.readdirSync(TEMP_DIR).filter((f) => f.endsWith(".json"))
  for (const file of files) {
    try {
      const params = JSON.parse(fs.readFileSync(path.join(TEMP_DIR, file), "utf-8")) as LoteParams
      if (params.codigo_lote === codigoLote) {
        return { tokenLote: file.replace(".json", ""), params }
      }
    } catch { continue }
  }
  return null
}

export function getLoteTempPath(codigoLote: string): string {
  const lotePath = path.join(TEMP_DIR, "batch", codigoLote)
  if (!fs.existsSync(lotePath)) fs.mkdirSync(lotePath, { recursive: true })
  return lotePath
}

export function cleanLoteTempPath(codigoLote: string): void {
  const lotePath = path.join(TEMP_DIR, "batch", codigoLote)
  if (fs.existsSync(lotePath)) fs.rmSync(lotePath, { recursive: true, force: true })
}
