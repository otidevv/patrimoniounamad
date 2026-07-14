import type { Config } from "jest"

// Configuración de Jest con ts-jest para pruebas unitarias de la lógica
// (funciones puras en lib/). No usa jsdom porque las funciones probadas
// no dependen del DOM; los E2E se cubren con Playwright (carpeta e2e/).
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Solo busca pruebas en __tests__ y archivos *.test.ts (no e2e de Playwright)
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.test.ts"],
  // Soporte para el alias "@/..." igual que en tsconfig.json
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  clearMocks: true,
}

export default config
