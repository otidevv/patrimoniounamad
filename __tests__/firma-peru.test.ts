import crypto from "crypto"
import { generarHashSha256 } from "@/lib/validaciones"
import { generateLoteId, generateTokenLote } from "@/lib/firma-peru/storage"

describe("Generación de hash para Firma Perú", () => {
  describe("generarHashSha256()", () => {
    it("genera el SHA-256 hexadecimal esperado de un texto", () => {
      // Hash conocido de la cadena "unamad"
      const esperado = crypto
        .createHash("sha256")
        .update("unamad")
        .digest("hex")
      expect(generarHashSha256("unamad")).toBe(esperado)
    })

    it("produce 64 caracteres hexadecimales", () => {
      const hash = generarHashSha256("documento.pdf")
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it("es determinista: misma entrada => mismo hash", () => {
      expect(generarHashSha256("acta-001")).toBe(generarHashSha256("acta-001"))
    })

    it("entradas distintas producen hashes distintos", () => {
      expect(generarHashSha256("acta-001")).not.toBe(generarHashSha256("acta-002"))
    })

    it("funciona con un Buffer (contenido de archivo)", () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46]) // "%PDF"
      expect(generarHashSha256(buffer)).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  describe("Identificadores de lote de firma", () => {
    it("generateLoteId() tiene el prefijo lote_", () => {
      expect(generateLoteId()).toMatch(/^lote_\d+_[a-z0-9]+$/)
    })

    it("generateTokenLote() tiene el prefijo token_", () => {
      expect(generateTokenLote()).toMatch(/^token_\d+_[a-z0-9]+$/)
    })

    it("genera identificadores distintos en llamadas sucesivas", () => {
      const ids = new Set([
        generateLoteId(),
        generateLoteId(),
        generateLoteId(),
      ])
      expect(ids.size).toBe(3)
    })
  })
})
