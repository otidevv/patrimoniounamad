"use client"

import { useEffect } from "react"

export function FirmaPeruScripts() {
  useEffect(() => {
    window.signatureInit = () => {
      console.log("[Firma Perú] Proceso iniciado")
      window.dispatchEvent(new CustomEvent("firma-peru-init"))
    }
    window.signatureOk = () => {
      console.log("[Firma Perú] Firma completada exitosamente")
      window.dispatchEvent(new CustomEvent("firma-peru-success"))
    }
    window.signatureCancel = () => {
      console.log("[Firma Perú] Firma cancelada por el usuario")
      window.dispatchEvent(new CustomEvent("firma-peru-cancel"))
    }
    return () => {
      delete window.signatureInit
      delete window.signatureOk
      delete window.signatureCancel
    }
  }, [])

  return null
}
