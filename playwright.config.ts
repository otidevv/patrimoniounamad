import { defineConfig, devices } from "@playwright/test"

// Configuración de Playwright para pruebas E2E (extremo a extremo).
// Levanta el servidor de Next.js automáticamente antes de correr las pruebas.
// Usa el puerto 3100 (propio) para NO chocar con otra app que pueda estar
// corriendo en el 3000 (p. ej. el panel de posgrado).
const PORT = process.env.PORT || "3100"
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Inicia el servidor de desarrollo de patrimonio en el puerto 3100.
  // reuseExistingServer: false evita conectarse por error a otra app en 3000.
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
