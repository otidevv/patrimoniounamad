"use client"

import { useState, useCallback, useRef } from "react"
import {
  FIRMA_PERU_PORT,
  FIRMA_PERU_STATIC_TOKEN,
  type FirmaLoteRequest,
  type FirmaPeruParams,
} from "@/lib/firma-peru"

declare global {
  interface Window {
    startSignature?: (port: number, params: string) => void
    signatureInit?: () => void
    signatureOk?: () => void
    signatureCancel?: () => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jqFirmaPeru?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jQuery?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $?: any
  }
}

function ensureJQueryGlobals(): void {
  // Asegurar que jQuery globals están configurados (cargados desde layout)
  if (window.jqFirmaPeru) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).$) (window as any).$ = window.jqFirmaPeru
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).jQuery) (window as any).jQuery = window.jqFirmaPeru
  }
}

// Esperar a que jQuery/jqFirmaPeru esté disponible (se carga desde el layout)
function waitForJQuery(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.jqFirmaPeru) { resolve(); return }
    const check = setInterval(() => {
      if (window.jqFirmaPeru) { clearInterval(check); resolve() }
    }, 100)
    setTimeout(() => {
      clearInterval(check)
      if (window.jqFirmaPeru) resolve()
      else reject(new Error("jQuery para Firma Perú no está disponible. Recargue la página."))
    }, 10000)
  })
}

function loadFirmaPeruScript(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await waitForJQuery()
    } catch (err) {
      reject(err)
      return
    }

    ensureJQueryGlobals()
    if (window.startSignature) { resolve(); return }
    if (document.getElementById("firma-peru-client")) {
      const check = setInterval(() => { if (window.startSignature) { clearInterval(check); resolve() } }, 100)
      setTimeout(() => { clearInterval(check); window.startSignature ? resolve() : reject(new Error("Timeout cargando script de Firma Perú")) }, 10000)
      return
    }
    const script = document.createElement("script")
    script.id = "firma-peru-client"
    script.src = "https://apps.firmaperu.gob.pe/web/clienteweb/firmaperu.min.js"
    script.async = true
    script.onload = () => {
      setTimeout(() => { window.startSignature ? resolve() : reject(new Error("Script cargado pero startSignature no disponible")) }, 500)
    }
    script.onerror = () => reject(new Error("Error al cargar el script de Firma Perú"))
    document.body.appendChild(script)
  })
}

export function useFirmaPeru() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scriptLoadedRef = useRef(false)

  const clearError = useCallback(() => setError(null), [])

  const firmarDocumentos = useCallback(async (params: FirmaLoteRequest) => {
    setIsLoading(true)
    setError(null)
    try {
      if (typeof window === "undefined") throw new Error("Solo funciona en el navegador")

      if (!window.startSignature && !scriptLoadedRef.current) {
        await loadFirmaPeruScript()
        scriptLoadedRef.current = true
      }
      if (!window.startSignature) {
        throw new Error("El cliente de Firma Perú no está disponible. Instale el cliente de Firma Perú y el plugin ClickOnce.")
      }

      ensureJQueryGlobals()

      const response = await fetch("/api/firma-peru/argumentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al preparar la firma")
      }

      const { token_lote } = await response.json()
      const argumentosUrl = `${window.location.origin}/api/firma-peru/argumentos?token_lote=${token_lote}`

      const firmaParams: FirmaPeruParams = {
        param_url: argumentosUrl,
        param_token: FIRMA_PERU_STATIC_TOKEN,
        document_extension: "pdf",
      }

      window.startSignature(FIRMA_PERU_PORT, btoa(JSON.stringify(firmaParams)))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      setError(msg)
      console.error("[Firma Perú] Error:", msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { firmarDocumentos, isLoading, error, clearError }
}
