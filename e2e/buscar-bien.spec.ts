import { test, expect } from "@playwright/test"
import { login, HAS_CREDENTIALS } from "./helpers"

// FLUJO E2E: Buscar un bien  +  Registrar/consultar un bien
test.describe("Buscar y consultar un bien", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!HAS_CREDENTIALS, "Define TEST_USER_EMAIL y TEST_USER_PASSWORD")
    await login(page)
  })

  test("muestra la página de búsqueda de bienes", async ({ page }) => {
    await page.goto("/dashboard/patrimonio/buscar")
    await expect(
      page.getByRole("heading", { name: /Buscar bien patrimonial/i })
    ).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Código Patrimonial" })).toBeVisible()
  })

  test("busca un bien por código patrimonial (consulta)", async ({ page }) => {
    // Código real existente en SIGA (COMPUTADORA PERSONAL PORTATIL).
    // Sobrescribible con TEST_BIEN_CODIGO si este bien cambia/se da de baja.
    const codigo = process.env.TEST_BIEN_CODIGO || "740805000001"
    test.skip(!codigo, "Define TEST_BIEN_CODIGO con un código existente en SIGA")

    await page.goto("/dashboard/patrimonio/buscar")
    await page.getByRole("textbox", { name: "Código Patrimonial" }).fill(codigo!)
    await page.getByRole("button", { name: "Buscar" }).click()

    // El código consultado debe aparecer en los resultados
    await expect(page.getByText(codigo!, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test("una búsqueda sin resultados informa al usuario", async ({ page }) => {
    await page.goto("/dashboard/patrimonio/buscar")
    // Código con formato válido (12 dígitos) pero inexistente en SIGA
    await page.getByRole("textbox", { name: "Código Patrimonial" }).fill("000000000000")
    await page.getByRole("button", { name: "Buscar" }).click()

    // La página muestra el estado "Bien no encontrado"
    await expect(page.getByText(/no encontrado|no fue encontrado/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })
})
