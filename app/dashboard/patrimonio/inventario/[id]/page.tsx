"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Barcode,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Package,
  User,
  Building2,
  RefreshCw,
  Pause,
  Check,
  AlertTriangle,
  Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Sesion {
  id: string
  codigo: string
  nombre: string
  estado: string
  totalBienesSiga: number
  totalVerificados: number
  totalEncontrados: number
  totalReubicados: number
  totalNoEncontrados: number
  totalSobrantes: number
  dependencia: { id: string; nombre: string; siglas: string | null } | null
  sede: { id: string; nombre: string } | null
}

interface Verificacion {
  id: string
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  serieSiga: string | null
  dependenciaSiga: string | null
  ubicacionSiga: string | null
  responsableSiga: string | null
  valorSiga: number | null
  resultado: string
  estadoFisico: string | null
  ubicacionReal: string | null
  observaciones: string | null
  fechaVerificacion: string
  verificador: { id: string; nombre: string; apellidos: string }
}

interface BienSIGA {
  codigo_patrimonial: string
  descripcion: string
  nombre_sede: string | null
  nombre_depend: string | null
  responsable: string | null
  usuario: string | null
  ubicacion_fisica: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
  valor_neto: number | null
}

export default function VerificacionPage() {
  const params = useParams()
  const router = useRouter()
  const sesionId = params.id as string

  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scanner state
  const [codigo, setCodigo] = useState("")
  const [modoEscaner, setModoEscaner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastInputTime = useRef<number>(0)
  const inputBuffer = useRef<string>("")

  // Verification result state
  const [bienEncontrado, setBienEncontrado] = useState<BienSIGA | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formVerificacion, setFormVerificacion] = useState({
    resultado: "ENCONTRADO",
    estadoFisico: "",
    ubicacionReal: "",
    observaciones: "",
  })

  const cargarSesion = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar sesión")
      }

      setSesion(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }, [sesionId])

  const cargarVerificaciones = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventario/verificaciones?sesionId=${sesionId}&limit=50`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar verificaciones")
      }

      setVerificaciones(data.verificaciones)
    } catch (err) {
      console.error("Error al cargar verificaciones:", err)
    }
  }, [sesionId])

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      await Promise.all([cargarSesion(), cargarVerificaciones()])
      setLoading(false)
    }
    cargarDatos()
  }, [cargarSesion, cargarVerificaciones])

  // Buscar bien y abrir diálogo
  const buscarYVerificar = useCallback(async (codigoBuscar: string) => {
    if (!codigoBuscar.trim() || codigoBuscar.length < 10) return

    setScanning(true)
    setError(null)

    try {
      // Primero buscar en SIGA
      const response = await fetch(
        `/api/patrimonio/buscar?codigo=${encodeURIComponent(codigoBuscar.trim())}`
      )
      const data = await response.json()

      if (response.ok && data.bien) {
        setBienEncontrado(data.bien)
        setFormVerificacion({
          resultado: "ENCONTRADO",
          estadoFisico: "",
          ubicacionReal: "",
          observaciones: "",
        })
      } else {
        // No encontrado en SIGA
        setBienEncontrado(null)
        setFormVerificacion({
          resultado: "SOBRANTE",
          estadoFisico: "",
          ubicacionReal: "",
          observaciones: "",
        })
      }

      setDialogOpen(true)
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setScanning(false)
    }
  }, [])

  // Detectar entrada de escáner
  useEffect(() => {
    if (!modoEscaner) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const timeDiff = now - lastInputTime.current

      if (timeDiff < 50 && inputBuffer.current.length > 0) {
        // Continuar acumulando
      } else if (timeDiff > 200) {
        inputBuffer.current = ""
      }

      if (e.key === "Enter") {
        if (inputBuffer.current.length >= 10) {
          setCodigo(inputBuffer.current)
          buscarYVerificar(inputBuffer.current)
        }
        inputBuffer.current = ""
        e.preventDefault()
      } else if (e.key.length === 1) {
        inputBuffer.current += e.key
      }

      lastInputTime.current = now
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [modoEscaner, buscarYVerificar])

  useEffect(() => {
    if (modoEscaner && inputRef.current) {
      inputRef.current.focus()
    }
  }, [modoEscaner])

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    buscarYVerificar(codigo)
  }

  const handleGuardarVerificacion = async () => {
    if (!sesion) return

    setSaving(true)
    try {
      const response = await fetch("/api/inventario/verificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesionId,
          codigoPatrimonial: codigo.trim(),
          resultado: formVerificacion.resultado,
          estadoFisico: formVerificacion.estadoFisico || null,
          ubicacionReal: formVerificacion.ubicacionReal || null,
          observaciones: formVerificacion.observaciones || null,
          dispositivoTipo: modoEscaner ? "PISTOLA" : "MANUAL",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setError("Este bien ya fue verificado en esta sesión")
        } else {
          throw new Error(data.error || "Error al guardar verificación")
        }
        return
      }

      // Éxito - cerrar diálogo y recargar
      setDialogOpen(false)
      setCodigo("")
      setBienEncontrado(null)
      await Promise.all([cargarSesion(), cargarVerificaciones()])

      // Focus en input para siguiente escaneo
      if (inputRef.current) {
        inputRef.current.focus()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleAccionSesion = async (accion: string) => {
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: accion }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al ejecutar acción")
      }

      if (accion === "finalizar") {
        router.push("/dashboard/patrimonio/inventario")
      } else {
        cargarSesion()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ejecutar acción")
    }
  }

  const getResultadoBadge = (resultado: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      ENCONTRADO: { color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
      REUBICADO: { color: "bg-blue-100 text-blue-800", icon: <MapPin className="h-3 w-3" /> },
      NO_ENCONTRADO: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
      SOBRANTE: { color: "bg-yellow-100 text-yellow-800", icon: <AlertTriangle className="h-3 w-3" /> },
    }
    const cfg = config[resultado] || config.ENCONTRADO
    return (
      <Badge className={`${cfg.color} gap-1`}>
        {cfg.icon}
        {resultado}
      </Badge>
    )
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sesion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-lg font-medium">Sesión no encontrada</h2>
        <Button onClick={() => router.push("/dashboard/patrimonio/inventario")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  const progreso = sesion.totalBienesSiga > 0
    ? (sesion.totalVerificados / sesion.totalBienesSiga) * 100
    : 0

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/patrimonio/inventario")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono">
                {sesion.codigo}
              </Badge>
              <Badge className="bg-green-100 text-green-800">En Proceso</Badge>
            </div>
            <h1 className="text-lg sm:text-xl font-bold truncate">{sesion.nombre}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAccionSesion("pausar")}
            >
              <Pause className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Pausar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccionSesion("finalizar")}
            >
              <Check className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Finalizar</span>
            </Button>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progreso de verificación</span>
              <span className="text-sm font-medium">
                {sesion.totalVerificados} verificados
              </span>
            </div>
            <Progress value={progreso} className="h-3 mb-3" />
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-green-50">
                <p className="font-bold text-green-700">{sesion.totalEncontrados}</p>
                <p className="text-green-600">Encontrados</p>
              </div>
              <div className="p-2 rounded bg-blue-50">
                <p className="font-bold text-blue-700">{sesion.totalReubicados}</p>
                <p className="text-blue-600">Reubicados</p>
              </div>
              <div className="p-2 rounded bg-red-50">
                <p className="font-bold text-red-700">{sesion.totalNoEncontrados}</p>
                <p className="text-red-600">Faltantes</p>
              </div>
              <div className="p-2 rounded bg-yellow-50">
                <p className="font-bold text-yellow-700">{sesion.totalSobrantes}</p>
                <p className="text-yellow-600">Sobrantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 flex-1">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanner Mode Toggle */}
      <Card className={modoEscaner ? "border-blue-200 bg-blue-50" : ""}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Barcode className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Escanear Código Patrimonial</span>
              </div>
              <form onSubmit={handleBuscar} className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Ingrese o escanee el código..."
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="font-mono text-lg h-12"
                  maxLength={12}
                  autoComplete="off"
                />
                <Button type="submit" disabled={scanning || !codigo.trim()} className="h-12 px-6">
                  {scanning ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
            <div className="flex items-end">
              <Button
                variant={modoEscaner ? "default" : "outline"}
                onClick={() => setModoEscaner(!modoEscaner)}
                className="h-12 gap-2"
              >
                <Barcode className="h-4 w-4" />
                {modoEscaner ? "Escáner Activo" : "Activar Escáner"}
              </Button>
            </div>
          </div>
          {modoEscaner && (
            <p className="text-sm text-blue-600 mt-2">
              Modo escáner activado. Escanea el código de barras para verificar automáticamente.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Verifications */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Verificaciones Recientes</CardTitle>
              <CardDescription>Últimos bienes verificados en esta sesión</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={cargarVerificaciones}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {verificaciones.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Package className="mx-auto h-10 w-10 mb-2 opacity-50" />
              <p>No hay verificaciones registradas</p>
              <p className="text-sm">Escanea un código para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead className="hidden md:table-cell">Estado Físico</TableHead>
                    <TableHead className="hidden lg:table-cell">Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verificaciones.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-sm">
                        {v.codigoPatrimonial}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate">
                        {v.descripcionSiga || "Sin información"}
                      </TableCell>
                      <TableCell>{getResultadoBadge(v.resultado)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {v.estadoFisico || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(v.fechaVerificacion).toLocaleTimeString("es-PE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Verificar Bien
            </DialogTitle>
            <DialogDescription>
              Código: <span className="font-mono font-bold">{codigo}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info del bien de SIGA */}
            {bienEncontrado ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Bien encontrado en SIGA</p>
                      <p className="text-sm text-green-700">{bienEncontrado.descripcion}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{bienEncontrado.marca || "N/A"} {bienEncontrado.modelo || ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{bienEncontrado.nombre_depend || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{bienEncontrado.responsable || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{bienEncontrado.ubicacion_fisica || "N/A"}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-green-200">
                    <span className="text-xs text-green-600">Valor Neto: </span>
                    <span className="font-medium text-green-800">
                      {formatCurrency(bienEncontrado.valor_neto)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Bien NO encontrado en SIGA</p>
                      <p className="text-sm text-yellow-700">
                        Este código no existe en el sistema. Se registrará como posible sobrante.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form de verificación */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Resultado de la verificación</Label>
                <Select
                  value={formVerificacion.resultado}
                  onValueChange={(value) =>
                    setFormVerificacion({ ...formVerificacion, resultado: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENCONTRADO">Encontrado (en su lugar)</SelectItem>
                    <SelectItem value="REUBICADO">Reubicado (en otro lugar)</SelectItem>
                    <SelectItem value="NO_ENCONTRADO">No encontrado (faltante)</SelectItem>
                    <SelectItem value="SOBRANTE">Sobrante (sin registro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Estado físico</Label>
                <Select
                  value={formVerificacion.estadoFisico}
                  onValueChange={(value) =>
                    setFormVerificacion({ ...formVerificacion, estadoFisico: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUENO">Bueno</SelectItem>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="MALO">Malo</SelectItem>
                    <SelectItem value="INOPERATIVO">Inoperativo</SelectItem>
                    <SelectItem value="CHATARRA">Chatarra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formVerificacion.resultado === "REUBICADO" && (
                <div className="grid gap-2">
                  <Label>Ubicación real donde se encontró</Label>
                  <Input
                    placeholder="Ej: Piso 2, Oficina 205"
                    value={formVerificacion.ubicacionReal}
                    onChange={(e) =>
                      setFormVerificacion({ ...formVerificacion, ubicacionReal: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Observaciones</Label>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  value={formVerificacion.observaciones}
                  onChange={(e) =>
                    setFormVerificacion({ ...formVerificacion, observaciones: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarVerificacion} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Verificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
