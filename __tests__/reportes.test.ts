import {
  formatearMoneda,
  formatearFechaCorta,
  contarPorEstado,
  sumarValorBienes,
} from "@/lib/validaciones"

describe("Lógica de cálculo y formato de reportes", () => {
  describe("formatearMoneda()", () => {
    it("formatea con dos decimales y prefijo S/", () => {
      expect(formatearMoneda(1500)).toBe("S/ 1500.00")
      expect(formatearMoneda(99.5)).toBe("S/ 99.50")
    })

    it("trata null/undefined como 0", () => {
      expect(formatearMoneda(null)).toBe("S/ 0.00")
      expect(formatearMoneda(undefined)).toBe("S/ 0.00")
    })
  })

  describe("formatearFechaCorta()", () => {
    it("formatea como DD/MM/AAAA", () => {
      expect(formatearFechaCorta(new Date(2024, 0, 5))).toBe("05/01/2024")
      expect(formatearFechaCorta(new Date(2026, 11, 31))).toBe("31/12/2026")
    })

    it("acepta cadenas ISO", () => {
      expect(formatearFechaCorta("2025-03-09T00:00:00")).toBe("09/03/2025")
    })

    it("devuelve cadena vacía con fecha inválida o nula", () => {
      expect(formatearFechaCorta(null)).toBe("")
      expect(formatearFechaCorta("no-es-fecha")).toBe("")
    })
  })

  describe("contarPorEstado()", () => {
    it("cuenta activos e inactivos (fila de totales del reporte)", () => {
      const usuarios = [
        { activo: true },
        { activo: true },
        { activo: false },
      ]
      expect(contarPorEstado(usuarios)).toEqual({
        total: 3,
        activos: 2,
        inactivos: 1,
      })
    })

    it("maneja lista vacía", () => {
      expect(contarPorEstado([])).toEqual({ total: 0, activos: 0, inactivos: 0 })
    })
  })

  describe("sumarValorBienes()", () => {
    it("suma el valor de compra de los bienes", () => {
      const bienes = [{ valorCompra: 100 }, { valorCompra: 250.5 }, { valorCompra: null }]
      expect(sumarValorBienes(bienes)).toBe(350.5)
    })

    it("devuelve 0 con lista vacía", () => {
      expect(sumarValorBienes([])).toBe(0)
    })
  })
})
