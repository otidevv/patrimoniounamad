import { cn } from "@/lib/utils"

describe("cn() - utilidad de combinación de clases", () => {
  it("une varias clases en una sola cadena", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4")
  })

  it("ignora valores falsy (false, null, undefined)", () => {
    expect(cn("px-2", false, null, undefined, "py-4")).toBe("px-2 py-4")
  })

  it("aplica clases condicionales", () => {
    const activo = true
    const deshabilitado = false
    expect(cn("base", activo && "activo", deshabilitado && "off")).toBe(
      "base activo"
    )
  })

  it("resuelve conflictos de Tailwind dejando la última clase", () => {
    // tailwind-merge: px-4 debe ganar sobre px-2
    expect(cn("px-2", "px-4")).toBe("px-4")
  })

  it("acepta arreglos y objetos (clsx)", () => {
    expect(cn(["text-sm", "font-bold"], { hidden: false, block: true })).toBe(
      "text-sm font-bold block"
    )
  })

  it("devuelve cadena vacía sin argumentos", () => {
    expect(cn()).toBe("")
  })
})
