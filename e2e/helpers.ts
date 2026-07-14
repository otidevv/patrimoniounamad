import { Page, expect } from "@playwright/test"

/**
 * Credenciales de prueba.
 *
 * Por defecto usa el usuario admin que crea el seed (prisma/seed.ts):
 *   admin@unamad.edu.pe / admin123
 * Requiere que la base de datos esté poblada:  npm run db:seed
 *
 * Se pueden sobrescribir con variables de entorno:
 *   $env:TEST_USER_EMAIL="otro@unamad.edu.pe"
 *   $env:TEST_USER_PASSWORD="..."
 */
export const TEST_EMAIL = process.env.TEST_USER_EMAIL || "admin@unamad.edu.pe"
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "admin123"
export const HAS_CREDENTIALS = Boolean(TEST_EMAIL && TEST_PASSWORD)

/**
 * Inicia sesión vía el formulario de login y espera llegar al dashboard.
 */
export async function login(page: Page): Promise<void> {
  await page.goto("/login")
  await page.getByPlaceholder("usuario@unamad.edu.pe").fill(TEST_EMAIL)
  await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD)
  await page.getByRole("button", { name: "Ingresar al Sistema" }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
}
