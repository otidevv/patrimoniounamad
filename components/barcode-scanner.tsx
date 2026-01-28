"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, X, Loader2, RefreshCw, ShieldAlert, VideoOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

type ErrorType = "permission" | "in-use" | "not-found" | "unknown"

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null)
  const [isStarting, setIsStarting] = useState(true)
  const [html5QrCode, setHtml5QrCode] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  const stopScanner = useCallback(async () => {
    if (html5QrCode) {
      try {
        const state = html5QrCode.getState()
        // Solo detener si está escaneando (state 2)
        if (state === 2) {
          await html5QrCode.stop()
        }
      } catch (e) {
        // Ignorar errores al detener
      }
    }
  }, [html5QrCode])

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      setIsStarting(true)
      setError(null)

      // Importar dinámicamente para evitar errores SSR
      const { Html5Qrcode } = await import("html5-qrcode")

      // Verificar si el elemento existe
      const element = document.getElementById("barcode-scanner-container")
      if (!element) {
        throw new Error("Container not found")
      }

      // Crear instancia del escáner
      const scanner = new Html5Qrcode("barcode-scanner-container")
      setHtml5QrCode(scanner)

      // Obtener cámaras disponibles
      let cameras
      try {
        cameras = await Html5Qrcode.getCameras()
      } catch (e) {
        // Error al obtener cámaras generalmente significa sin permisos
        if (!mountedRef.current) return
        setError({
          type: "permission",
          message: "Se necesitan permisos para acceder a la cámara. Por favor, permite el acceso en tu navegador."
        })
        setIsStarting(false)
        return
      }

      if (!cameras || cameras.length === 0) {
        if (!mountedRef.current) return
        setError({
          type: "not-found",
          message: "No se encontraron cámaras en este dispositivo."
        })
        setIsStarting(false)
        return
      }

      // Preferir cámara trasera
      const backCamera = cameras.find(
        (c: any) =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("trasera") ||
          c.label.toLowerCase().includes("rear") ||
          c.label.toLowerCase().includes("environment")
      )
      const cameraId = backCamera?.id || cameras[0].id

      // Iniciar escáner
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 280, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText: string) => {
          if (!mountedRef.current) return
          // Código detectado
          scanner.stop().then(() => {
            onScan(decodedText)
          }).catch(() => {
            onScan(decodedText)
          })
        },
        () => {
          // Callback de error de escaneo (ignorar, es normal mientras busca)
        }
      )

      if (mountedRef.current) {
        setIsStarting(false)
      }
    } catch (err: any) {
      if (!mountedRef.current) return

      console.error("Error al iniciar escáner:", err)

      let errorInfo: { type: ErrorType; message: string }

      if (err.name === "NotReadableError" || err.message?.includes("in use")) {
        errorInfo = {
          type: "in-use",
          message: "La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara (Zoom, Meet, Teams, etc.) e intenta de nuevo."
        }
      } else if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
        errorInfo = {
          type: "permission",
          message: "Permiso de cámara denegado. Permite el acceso a la cámara en la configuración de tu navegador."
        }
      } else if (err.name === "NotFoundError") {
        errorInfo = {
          type: "not-found",
          message: "No se encontró ninguna cámara disponible."
        }
      } else {
        errorInfo = {
          type: "unknown",
          message: err.message || "Error desconocido al acceder a la cámara."
        }
      }

      setError(errorInfo)
      setIsStarting(false)
    }
  }, [onScan])

  useEffect(() => {
    mountedRef.current = true

    // Pequeño delay para asegurar que el DOM está listo
    const timer = setTimeout(() => {
      startScanner()
    }, 100)

    return () => {
      mountedRef.current = false
      clearTimeout(timer)
      stopScanner()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = async () => {
    await stopScanner()
    startScanner()
  }

  const handleClose = async () => {
    await stopScanner()
    onClose()
  }

  const getErrorIcon = () => {
    switch (error?.type) {
      case "permission":
        return <ShieldAlert className="h-12 w-12 mx-auto text-yellow-400" />
      case "in-use":
        return <VideoOff className="h-12 w-12 mx-auto text-orange-400" />
      case "not-found":
        return <Camera className="h-12 w-12 mx-auto text-gray-400" />
      default:
        return <X className="h-12 w-12 mx-auto text-red-400" />
    }
  }

  return (
    <Card className="fixed inset-0 z-50 bg-black/95 m-0 rounded-none border-0">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/50">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-5 w-5" />
            <span className="font-medium">Escanear Código de Barras</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner area */}
        <div className="flex-1 flex items-center justify-center relative" ref={containerRef}>
          {isStarting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Iniciando cámara...</p>
                <p className="text-sm text-gray-400 mt-1">
                  Es posible que tu navegador solicite permisos
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10 p-4">
              <div className="text-center text-white max-w-sm">
                <div className="mb-4">
                  {getErrorIcon()}
                </div>
                <p className="text-lg font-medium mb-2">
                  {error.type === "permission" && "Permisos requeridos"}
                  {error.type === "in-use" && "Cámara ocupada"}
                  {error.type === "not-found" && "Cámara no encontrada"}
                  {error.type === "unknown" && "Error de cámara"}
                </p>
                <p className="text-sm text-gray-400 mb-6">{error.message}</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleRetry} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                  </Button>
                  <Button onClick={handleClose} variant="ghost">
                    Cerrar
                  </Button>
                </div>

                {error.type === "permission" && (
                  <div className="mt-6 p-3 bg-white/10 rounded-lg text-left text-xs text-gray-300">
                    <p className="font-medium mb-1">¿Cómo dar permisos?</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Busca el icono de cámara en la barra de direcciones</li>
                      <li>O ve a Configuración del navegador → Privacidad → Cámara</li>
                      <li>Permite el acceso para este sitio</li>
                    </ul>
                  </div>
                )}

                {error.type === "in-use" && (
                  <div className="mt-6 p-3 bg-white/10 rounded-lg text-left text-xs text-gray-300">
                    <p className="font-medium mb-1">Posibles causas:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Zoom, Google Meet, Teams u otra videollamada abierta</li>
                      <li>Otra pestaña del navegador usando la cámara</li>
                      <li>Aplicación de cámara o grabación activa</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            id="barcode-scanner-container"
            className="w-full max-w-md mx-auto"
            style={{ minHeight: "300px" }}
          />
        </div>

        {/* Instructions */}
        {!error && (
          <div className="p-4 bg-black/50 text-center">
            <p className="text-white/80 text-sm">
              Apunta la cámara al código de barras del bien patrimonial
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
