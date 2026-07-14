import { test, expect } from "@playwright/test"

// Pruebas E2E de la página de inicio de sesión.
test.describe("Página de Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("muestra el título y los campos del formulario", async ({ page }) => {
    // CardTitle de shadcn se renderiza como <div>, no como heading
    await expect(page.getByText("Iniciar Sesión", { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder("usuario@unamad.edu.pe")).toBeVisible()
    await expect(page.getByPlaceholder("••••••••")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Ingresar al Sistema" })
    ).toBeVisible()
  })

  test("permite mostrar y ocultar la contraseña", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("••••••••")
    await passwordInput.fill("secreta123")
    // Por defecto es de tipo password (oculta)
    await expect(passwordInput).toHaveAttribute("type", "password")
    // El botón del ojo es el botón sin nombre dentro del campo de contraseña
    await passwordInput.locator("..").getByRole("button").click()
    await expect(passwordInput).toHaveAttribute("type", "text")
  })

  test("muestra error con credenciales inválidas", async ({ page }) => {
    await page.getByPlaceholder("usuario@unamad.edu.pe").fill("noexiste@unamad.edu.pe")
    await page.getByPlaceholder("••••••••").fill("claveincorrecta")
    await page.getByRole("button", { name: "Ingresar al Sistema" }).click()

    // El formulario muestra un mensaje de error sin redirigir
    await expect(page.getByText(/error|incorrec|inválid|no.*encontr/i)).toBeVisible({
      timeout: 10_000,
    })
    await expect(page).toHaveURL(/\/login/)
  })

  test("tiene enlace para recuperar contraseña", async ({ page }) => {
    const link = page.getByRole("link", { name: "¿Olvidó su contraseña?" })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/forgot-password")
  })

  test("ofrece inicio de sesión con Google", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /Ingresar con Google/i })
    ).toBeVisible()
  })
})
