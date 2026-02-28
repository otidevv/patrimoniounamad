"use client"

import { useState, useEffect, useCallback } from "react"
import {
  type ZebraDevice,
  getAvailablePrinters,
  sendZplToPrinter,
} from "@/lib/zebra-printer"

export function useZebraPrinter() {
  const [printers, setPrinters] = useState<ZebraDevice[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<ZebraDevice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isConnected = printers.length > 0 && selectedPrinter !== null

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const devices = await getAvailablePrinters()
      setPrinters(devices)
      if (devices.length > 0 && !selectedPrinter) {
        setSelectedPrinter(devices[0])
      } else if (devices.length === 0) {
        setSelectedPrinter(null)
      }
    } catch {
      setError("No se pudo conectar con Zebra Browser Print")
      setPrinters([])
      setSelectedPrinter(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedPrinter])

  useEffect(() => {
    let ignore = false

    async function detect() {
      setIsLoading(true)
      setError(null)

      // Zebra Browser Print necesita tiempo en la primera conexión.
      // Si no encuentra impresoras, reintenta hasta 3 veces con pausa.
      const MAX_RETRIES = 3
      const RETRY_DELAY = 1500

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (ignore) return

        try {
          const devices = await getAvailablePrinters()
          if (ignore) return

          if (devices.length > 0) {
            setPrinters(devices)
            setSelectedPrinter(devices[0])
            setIsLoading(false)
            return
          }
        } catch {
          // Ignorar, se reintenta
        }

        // Esperar antes de reintentar (excepto en el último intento)
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY))
        }
      }

      // Agotó reintentos sin encontrar impresora
      if (!ignore) {
        setPrinters([])
        setSelectedPrinter(null)
        setIsLoading(false)
      }
    }

    detect()
    return () => { ignore = true }
  }, [])

  const selectPrinter = useCallback((device: ZebraDevice) => {
    setSelectedPrinter(device)
  }, [])

  const printLabel = useCallback(
    async (zpl: string): Promise<boolean> => {
      if (!selectedPrinter) {
        setError("No hay impresora seleccionada")
        return false
      }
      try {
        await sendZplToPrinter(selectedPrinter, zpl)
        return true
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al imprimir"
        )
        return false
      }
    },
    [selectedPrinter]
  )

  return {
    isConnected,
    isLoading,
    printers,
    selectedPrinter,
    error,
    refresh,
    printLabel,
    selectPrinter,
  }
}
