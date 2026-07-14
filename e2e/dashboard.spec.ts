import { test, expect } from "@playwright/test"
import { login, HAS_CREDENTIALS } from "./helpers"

// FLUJO E2E: Login y acceso al dashboard
test.describe("Login y acceso al dashboard", () => {
  test("una ruta protegida redirige a /login si no hay sesión", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("la búsqueda de bienes también está protegida", async ({ page }) => {
    await page.goto("/dashboard/patrimonio/buscar")
    await expect(page).toHaveURL(/\/login/)
  })

  test("inicia sesión y entra al dashboard", async ({ page }) => {
    test.skip(!HAS_CREDENTIALS, "Define TEST_USER_EMAIL y TEST_USER_PASSWORD")
    await login(page)
    await expect(page).toHaveURL(/\/dashboard/)
    // El header del dashboard está presente
    await expect(
      page.getByText("Sistema de Gestión de Patrimonio")
    ).toBeVisible()
  })
})
