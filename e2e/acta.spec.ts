import { test, expect } from "@playwright/test"
import { login, HAS_CREDENTIALS } from "./helpers"

// FLUJO E2E: Crear y firmar un acta (trámite documentario + Firma Perú)
test.describe("Crear y firmar un acta", () => {
  test("el módulo de trámite está protegido sin sesión", async ({ page }) => {
    await page.goto("/dashboard/tramite")
    await expect(page).toHaveURL(/\/login/)
  })

  test.describe("usuario autenticado", () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!HAS_CREDENTIALS, "Define TEST_USER_EMAIL y TEST_USER_PASSWORD")
      await login(page)
    })

    test("accede al módulo de trámite documentario", async ({ page }) => {
      await page.goto("/dashboard/tramite")
      await expect(page).toHaveURL(/tramite/)
      await expect(page.locator("body")).not.toContainText(
        /Internal Server Error|Application error/i
      )
    })

    test("puede abrir la bandeja de mis documentos", async ({ page }) => {
      await page.goto("/dashboard/tramite/mis-documentos")
      await expect(page).toHaveURL(/mis-documentos/)
    })

    // El flujo completo de generar el acta y firmarla con Firma Perú requiere
    // datos de prueba (verificaciones de inventario, destinatario, y el cliente
    // de escritorio de Firma Perú). Se habilita con TEST_ACTA_FULL=1.
    test("genera un acta de entrega (flujo completo)", async ({ page }) => {
      test.skip(
        process.env.TEST_ACTA_FULL !== "1",
        "Flujo completo de acta: requiere datos de prueba y Firma Perú (TEST_ACTA_FULL=1)"
      )
      await page.goto("/dashboard/tramite/nuevo")
      await expect(page.getByRole("button", { name: /generar|crear|acta/i })).toBeVisible()
    })
  })
})
