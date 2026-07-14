import {
  esCodigoPatrimonialValido,
  validarBien,
} from "@/lib/validaciones"

describe("Validación de datos de un bien", () => {
  describe("esCodigoPatrimonialValido()", () => {
    it("acepta un código de 12 dígitos", () => {
      expect(esCodigoPatrimonialValido("740895200001")).toBe(true)
    })

    it("ignora espacios alrededor", () => {
      expect(esCodigoPatrimonialValido("  740895200001  ")).toBe(true)
    })

    it("rechaza códigos con menos o más de 12 dígitos", () => {
      expect(esCodigoPatrimonialValido("12345")).toBe(false)
      expect(esCodigoPatrimonialValido("7408952000010")).toBe(false)
    })

    it("rechaza códigos con letras o símbolos", () => {
      expect(esCodigoPatrimonialValido("74089520000A")).toBe(false)
      expect(esCodigoPatrimonialValido("7408-9520-0001")).toBe(false)
    })

    it("rechaza vacío, null y undefined", () => {
      expect(esCodigoPatrimonialValido("")).toBe(false)
      expect(esCodigoPatrimonialValido(null)).toBe(false)
      expect(esCodigoPatrimonialValido(undefined)).toBe(false)
    })
  })

  describe("validarBien()", () => {
    it("valida un bien correcto sin errores", () => {
      const r = validarBien({
        codigoPatrimonial: "740895200001",
        descripcion: "Laptop HP ProBook",
        valorCompra: 3500,
      })
      expect(r.valido).toBe(true)
      expect(r.errores).toHaveLength(0)
    })

    it("exige código patrimonial", () => {
      const r = validarBien({ descripcion: "Silla" })
      expect(r.valido).toBe(false)
      expect(r.errores).toContain("El código patrimonial es obligatorio")
    })

    it("exige formato correcto del código", () => {
      const r = validarBien({ codigoPatrimonial: "ABC", descripcion: "Silla" })
      expect(r.valido).toBe(false)
      expect(r.errores).toContain(
        "El código patrimonial debe tener 12 dígitos numéricos"
      )
    })

    it("exige descripción", () => {
      const r = validarBien({ codigoPatrimonial: "740895200001", descripcion: "  " })
      expect(r.valido).toBe(false)
      expect(r.errores).toContain("La descripción es obligatoria")
    })

    it("rechaza valor de compra negativo", () => {
      const r = validarBien({
        codigoPatrimonial: "740895200001",
        descripcion: "Monitor",
        valorCompra: -10,
      })
      expect(r.valido).toBe(false)
      expect(r.errores).toContain("El valor de compra no puede ser negativo")
    })

    it("acumula varios errores a la vez", () => {
      const r = validarBien({ codigoPatrimonial: "", descripcion: "" })
      expect(r.valido).toBe(false)
      expect(r.errores.length).toBeGreaterThanOrEqual(2)
    })
  })
})
