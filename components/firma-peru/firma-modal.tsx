"use client"

import { useState, useEffect } from "react"
import { useFirmaPeru } from "@/hooks/use-firma-peru"
import { MOTIVOS_FIRMA, APARIENCIAS_FIRMA } from "@/lib/firma-peru"
import { PenTool, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FirmaModalProps {
  isOpen: boolean
  onClose: () => void
  archivos: { id: string; nombre: string; url: string }[]
  onSuccess?: () => void
}

export function FirmaModal({ isOpen, onClose, archivos, onSuccess }: FirmaModalProps) {
  const { firmarDocumentos, isLoading, error, clearError } = useFirmaPeru()

  const [nombreLote, setNombreLote] = useState("")
  const [motivo, setMotivo] = useState<string>(MOTIVOS_FIRMA.AUTOR.toString())
  const [apariencia, setApariencia] = useState<string>(APARIENCIAS_FIRMA.HORIZONTAL.toString())
  const [firmaExitosa, setFirmaExitosa] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const formatted = now.toLocaleString("es-PE", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })
      setNombreLote(`Firma ${formatted}`)
      setFirmaExitosa(false)
      clearError()
    }
  }, [isOpen, clearError])

  useEffect(() => {
    const handleSuccess = () => {
      setFirmaExitosa(true)
      onSuccess?.()
    }
    window.addEventListener("firma-peru-success", handleSuccess)
    return () => window.removeEventListener("firma-peru-success", handleSuccess)
  }, [onSuccess])

  const handleSubmit = async () => {
    if (archivos.length === 0) return
    await firmarDocumentos({
      archivo_ids: archivos.map((a) => a.id),
      archivo_rutas: archivos.map((a) => a.url),
      motivo: parseInt(motivo) as 1 | 2,
      apariencia: parseInt(apariencia) as 1 | 2,
      nombre_lote: nombreLote,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-blue-600" />
            Firma Digital — Firma Perú
          </DialogTitle>
          <DialogDescription>
            Configura y firma tus documentos con certificado digital
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {firmaExitosa && (
            <div className="flex items-center gap-2 p-3 text-green-800 bg-green-50 border border-green-200 rounded-lg text-sm">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>Documentos firmados correctamente</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 text-red-800 bg-red-50 border border-red-200 rounded-lg text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              {archivos.length} documento(s) seleccionado(s)
            </p>
            <div className="mt-1 space-y-0.5 max-h-[80px] overflow-y-auto">
              {archivos.map((a) => (
                <p key={a.id} className="text-xs text-blue-700 truncate">{a.nombre}</p>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreLote">Nombre del lote</Label>
            <Input
              id="nombreLote"
              value={nombreLote}
              onChange={(e) => setNombreLote(e.target.value)}
              placeholder="Ej: Firma documentos abril 2026"
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo de la firma</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Soy el autor del documento</SelectItem>
                <SelectItem value="2">Doy V° B°</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Apariencia de la firma</Label>
            <Select value={apariencia} onValueChange={setApariencia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sello + Descripción Horizontal</SelectItem>
                <SelectItem value="2">Sello + Descripción Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <p className="font-medium">Requisitos:</p>
            <ul className="list-disc ml-4 space-y-0.5">
              <li>Tener instalado el <strong>Cliente de Firma Perú</strong></li>
              <li>Plugin ClickOnce en el navegador</li>
              <li>Certificado digital válido (DNIe o certificado acreditado)</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {firmaExitosa ? "Cerrar" : "Cancelar"}
          </Button>
          {!firmaExitosa && (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || archivos.length === 0}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Iniciar Firma
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
