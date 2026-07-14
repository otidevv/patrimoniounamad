import { test, expect } from "@playwright/test"
import { login, HAS_CREDENTIALS } from "./helpers"

// FLUJO E2E: Ver "mis bienes"
test.describe('Ver "mis bienes"', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!HAS_CREDENTIALS, "Define TEST_USER_EMAIL y TEST_USER_PASSWORD")
    await login(page)
  })

  test("la ruta está protegida sin sesión", async ({ page, context }) => {
    await context.clearCookies()
    await page.goto("/dashboard/patrimonio/mis-bienes")
    await expect(page).toHaveURL(/\/login/)
  })

  test("muestra la página de mis bienes al usuario autenticado", async ({ page }) => {
    await page.goto("/dashboard/patrimonio/mis-bienes")
    await expect(page).toHaveURL(/mis-bienes/)
    // Debe mostrarse o bien la lista de bienes o un estado vacío,
    // pero nunca un error de servidor.
    await expect(page.locator("body")).not.toContainText(
      /Internal Server Error|Application error/i
    )
  })

  test("la API de mis-bienes responde para el usuario autenticado", async ({ page }) => {
    const resp = await page.request.get("/api/patrimonio/mis-bienes")
    // 200 con datos, o 400 si el usuario no tiene número de documento;
    // lo importante es que NO sea 401/500.
    expect([200, 400]).toContain(resp.status())
  })
})
