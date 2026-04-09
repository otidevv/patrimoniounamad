/**
 * Gestión del token JWT de Firma Perú
 */

let cachedToken: string | null = null
let tokenExpiration: Date | null = null

function getJwtExpiration(jwt: string): Date | null {
  try {
    const parts = jwt.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"))
    return payload.exp ? new Date(payload.exp * 1000) : null
  } catch {
    return null
  }
}

function isTokenExpired(): boolean {
  if (!tokenExpiration) return true
  const bufferTime = 5 * 60 * 1000
  return new Date().getTime() > tokenExpiration.getTime() - bufferTime
}

export async function getFirmaPeruToken(): Promise<string | null> {
  const clientId = process.env.PCM_CLIENT_ID
  const clientSecret = process.env.PCM_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("PCM_CLIENT_ID o PCM_CLIENT_SECRET no configurados")
    return null
  }

  if (cachedToken && !isTokenExpired()) return cachedToken

  try {
    const response = await fetch(
      "https://apps.firmaperu.gob.pe/admin/api/security/generate-token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
      }
    )

    const token = await response.text()
    if (token && typeof token === "string") {
      cachedToken = token
      tokenExpiration = getJwtExpiration(token)
      return token
    }
    return null
  } catch (error) {
    console.error("Error al obtener token de Firma Perú:", error)
    return null
  }
}

export function invalidateToken(): void {
  cachedToken = null
  tokenExpiration = null
}
