import bcrypt from "bcryptjs"
import { esEmailInstitucional, validarEntradaLogin } from "@/lib/validaciones"

describe("Validación de credenciales (bcrypt)", () => {
  // Mismo mecanismo que usa /api/auth/login: bcrypt.compare(plano, hash)
  describe("bcrypt - verificación de contraseña", () => {
    const passwordPlano = "ClaveSegura123"
    let hash: string

    beforeAll(async () => {
      hash = await bcrypt.hash(passwordPlano, 10)
    })

    it("la contraseña correcta coincide con el hash", async () => {
      expect(await bcrypt.compare(passwordPlano, hash)).toBe(true)
    })

    it("una contraseña incorrecta NO coincide", async () => {
      expect(await bcrypt.compare("claveIncorrecta", hash)).toBe(false)
    })

    it("el hash es distinto del texto plano (no se guarda en claro)", () => {
      expect(hash).not.toBe(passwordPlano)
      expect(hash.startsWith("$2")).toBe(true) // formato bcrypt
    })

    it("dos hashes de la misma contraseña son distintos (salt)", async () => {
      const otro = await bcrypt.hash(passwordPlano, 10)
      expect(otro).not.toBe(hash)
      // pero ambos validan la misma contraseña
      expect(await bcrypt.compare(passwordPlano, otro)).toBe(true)
    })
  })

  describe("validarEntradaLogin()", () => {
    it("acepta email y contraseña presentes", () => {
      const r = validarEntradaLogin("user@unamad.edu.pe", "123456")
      expect(r.valido).toBe(true)
    })

    it("rechaza email faltante", () => {
      const r = validarEntradaLogin("", "123456")
      expect(r.valido).toBe(false)
      expect(r.errores).toContain("El email es requerido")
    })

    it("rechaza contraseña faltante", () => {
      const r = validarEntradaLogin("user@unamad.edu.pe", "")
      expect(r.valido).toBe(false)
      expect(r.errores).toContain("La contraseña es requerida")
    })
  })

  describe("esEmailInstitucional()", () => {
    it("acepta correos @unamad.edu.pe", () => {
      expect(esEmailInstitucional("juan.perez@unamad.edu.pe")).toBe(true)
      expect(esEmailInstitucional("ADMIN@UNAMAD.EDU.PE")).toBe(true)
    })

    it("rechaza otros dominios", () => {
      expect(esEmailInstitucional("user@gmail.com")).toBe(false)
      expect(esEmailInstitucional("user@unamad.com")).toBe(false)
    })

    it("rechaza valores vacíos o nulos", () => {
      expect(esEmailInstitucional("")).toBe(false)
      expect(esEmailInstitucional(null)).toBe(false)
    })
  })
})
