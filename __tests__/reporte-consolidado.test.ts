import {
  esEquipoComputo,
  whereEquipoComputo,
  resumenSesiones,
} from "@/lib/reporte-consolidado"

describe("Lógica del reporte consolidado de sesiones", () => {
  describe("esEquipoComputo()", () => {
    it("es equipo de cómputo si tiene alguna especificación técnica", () => {
      expect(esEquipoComputo({ procesador: "Intel Core i5" })).toBe(true)
      expect(esEquipoComputo({ ram: "8GB" })).toBe(true)
      expect(esEquipoComputo({ disco: "SSD 512GB" })).toBe(true)
      expect(esEquipoComputo({ sistemaOperativo: "Windows 11" })).toBe(true)
      expect(esEquipoComputo({ generacion: "10ma" })).toBe(true)
    })

    it("no es equipo de cómputo sin especificaciones", () => {
      expect(
        esEquipoComputo({
          procesador: null,
          generacion: null,
          sistemaOperativo: null,
          ram: null,
          disco: null,
        })
      ).toBe(false)
      expect(esEquipoComputo({})).toBe(false)
    })

    it("ignora cadenas vacías", () => {
      expect(esEquipoComputo({ procesador: "", ram: "" })).toBe(false)
    })
  })

  describe("whereEquipoComputo()", () => {
    it("genera un OR sobre las cinco especificaciones técnicas", () => {
      const where = whereEquipoComputo()
      expect(where.OR).toHaveLength(5)
      const campos = where.OR.map((c) => Object.keys(c)[0])
      expect(campos).toEqual([
        "procesador",
        "generacion",
        "sistemaOperativo",
        "ram",
        "disco",
      ])
    })

    it("cada condición excluye null y cadena vacía", () => {
      const where = whereEquipoComputo()
      for (const condicion of where.OR) {
        const campo = Object.keys(condicion)[0]
        expect(condicion[campo]).toEqual({ not: null, notIn: [""] })
      }
    })
  })

  describe("resumenSesiones()", () => {
    const sesiones = [
      {
        estado: "FINALIZADA",
        totalBienesSiga: 100,
        totalVerificados: 90,
        totalEncontrados: 80,
        totalReubicados: 5,
        totalNoEncontrados: 5,
        totalSobrantes: 2,
      },
      {
        estado: "EN_PROCESO",
        totalBienesSiga: 50,
        totalVerificados: 20,
        totalEncontrados: 15,
        totalReubicados: 2,
        totalNoEncontrados: 3,
        totalSobrantes: 0,
      },
    ]

    it("suma los totales de todas las sesiones", () => {
      const resumen = resumenSesiones(sesiones)
      expect(resumen).toEqual({
        totalSesiones: 2,
        sesionesFinalizadas: 1,
        sesionesEnProceso: 1,
        totalBienesSiga: 150,
        totalVerificados: 110,
        totalEncontrados: 95,
        totalReubicados: 7,
        totalNoEncontrados: 8,
        totalSobrantes: 2,
      })
    })

    it("maneja lista vacía", () => {
      expect(resumenSesiones([])).toEqual({
        totalSesiones: 0,
        sesionesFinalizadas: 0,
        sesionesEnProceso: 0,
        totalBienesSiga: 0,
        totalVerificados: 0,
        totalEncontrados: 0,
        totalReubicados: 0,
        totalNoEncontrados: 0,
        totalSobrantes: 0,
      })
    })
  })
})
