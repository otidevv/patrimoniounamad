"use client"

import { Loader2, WifiOff, Printer, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface PrintLabelButtonProps {
  zpl: string
  count?: number
  disabled?: boolean
  className?: string
  // Estado de la impresora (viene del hook en la pagina padre)
  isConnected: boolean
  isLoading: boolean
  printerName: string | null
  error: string | null
  onRefresh: () => void
  onPrint: (zpl: string) => Promise<boolean>
}

export function PrintLabelButton({
  zpl,
  count,
  disabled,
  className,
  isConnected,
  isLoading,
  printerName,
  error,
  onRefresh,
  onPrint,
}: PrintLabelButtonProps) {
  const handlePrint = async () => {
    if (!zpl) return
    const success = await onPrint(zpl)
    if (success) {
      toast.success(
        count && count > 1
          ? `${count} etiquetas enviadas a la impresora`
          : "Etiqueta enviada a la impresora"
      )
    } else {
      toast.error(error || "Error al enviar a la impresora")
    }
  }

  // Estado: Cargando
  if (isLoading) {
    return (
      <Button variant="outline" disabled className={cn("gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Detectando impresora...
      </Button>
    )
  }

  // Estado: Desconectada
  if (!isConnected) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" disabled className="gap-2">
              <WifiOff className="h-4 w-4" />
              Zebra no detectada
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Instala y ejecuta Zebra Browser Print</p>
            <p>para imprimir directamente a la Zebra ZD220</p>
          </TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Estado: Conectada
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant="outline"
        className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        {printerName || "Zebra"}
      </Badge>
      <Button
        onClick={handlePrint}
        disabled={disabled || !zpl}
        className="gap-2"
      >
        <Printer className="h-4 w-4" />
        Imprimir Zebra{count ? ` (${count})` : ""}
      </Button>
    </div>
  )
}
