"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Barcode,
  Camera,
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  ListChecks,
  FileSpreadsheet,
  Download,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { BarcodeScanner } from "@/components/barcode-scanner"

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
  sigaCentroCosto: string | null
  sigaNombreDependencia: string | null
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

interface BienEsperado extends BienSIGA {
  verificado?: boolean
  resultado_verificacion?: string | null
}

interface ResumenUsuario {
  empleado_final: string
  usuario_nombre: string | null
  docum_ident: string | null
  total_bienes: number
  total_verificados: number
  porcentaje: number
}

export default function VerificacionPage() {
  const params = useParams()
  const router = useRouter()
  const sesionId = params.id as string

  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [loading, setLoading] = useState(true)

  // Scanner state
  const [codigo, setCodigo] = useState("")
  const [modoEscaner, setModoEscaner] = useState(false)
  const [modoCamara, setModoCamara] = useState(false)
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

  // Bienes esperados state
  const [bienesEsperados, setBienesEsperados] = useState<BienEsperado[]>([])
  const [bienesPage, setBienesPage] = useState(1)
  const [bienesTotalPages, setBienesTotalPages] = useState(1)
  const [bienesTotal, setBienesTotal] = useState(0)
  const [loadingBienes, setLoadingBienes] = useState(false)

  // Reporte usuarios state
  const [resumenUsuarios, setResumenUsuarios] = useState<ResumenUsuario[]>([])
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [usuarioExpandido, setUsuarioExpandido] = useState<string | null>(null)
  const [bienesUsuario, setBienesUsuario] = useState<BienEsperado[]>([])
  const [loadingBienesUsuario, setLoadingBienesUsuario] = useState(false)

  const cargarSesion = useCallback(async () => {
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar sesión")
      }

      setSesion(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar sesión")
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

  const cargarBienesEsperados = useCallback(async (page: number = 1) => {
    if (!sesion?.sigaCentroCosto) return

    setLoadingBienes(true)
    try {
      const params = new URLSearchParams({
        centroCosto: sesion.sigaCentroCosto,
        sesionId,
        page: String(page),
        pageSize: "20",
      })
      const response = await fetch(`/api/siga/bienes?${params}`)
      const data = await response.json()

      if (response.ok) {
        setBienesEsperados(data.bienes)
        setBienesTotalPages(data.totalPages)
        setBienesTotal(data.total)
        setBienesPage(page)
      }
    } catch (err) {
      console.error("Error al cargar bienes esperados:", err)
    } finally {
      setLoadingBienes(false)
    }
  }, [sesion?.sigaCentroCosto, sesionId])

  const cargarReporteUsuarios = useCallback(async () => {
    if (!sesion?.sigaCentroCosto) return

    setLoadingReporte(true)
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}/reporte-usuarios`)
      const data = await response.json()

      if (response.ok) {
        setResumenUsuarios(data.resumen)
      }
    } catch (err) {
      console.error("Error al cargar reporte:", err)
    } finally {
      setLoadingReporte(false)
    }
  }, [sesion?.sigaCentroCosto, sesionId])

  const cargarBienesDeUsuario = async (empleadoFinal: string) => {
    if (usuarioExpandido === empleadoFinal) {
      setUsuarioExpandido(null)
      setBienesUsuario([])
      return
    }

    setUsuarioExpandido(empleadoFinal)
    setLoadingBienesUsuario(true)
    try {
      const params = new URLSearchParams({
        empleadoFinal,
      })
      const response = await fetch(
        `/api/inventario/sesiones/${sesionId}/reporte-usuarios?${params}`
      )
      const data = await response.json()

      if (response.ok) {
        setBienesUsuario(data.bienes)
      }
    } catch (err) {
      console.error("Error al cargar bienes del usuario:", err)
    } finally {
      setLoadingBienesUsuario(false)
    }
  }

  const descargarAnexo7 = async (empleadoFinal: string, nombreUsuario: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      toast.loading("Generando Anexo 7...", { id: "anexo7" })
      const params = new URLSearchParams({ empleadoFinal })
      const response = await fetch(
        `/api/inventario/sesiones/${sesionId}/anexo7?${params}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al generar reporte")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] || `Anexo7_${empleadoFinal}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Anexo 7 descargado correctamente", { id: "anexo7" })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al descargar reporte",
        { id: "anexo7" }
      )
    }
  }

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
      toast.error("Error de conexión al servidor")
    } finally {
      setScanning(false)
    }
  }, [])

  // Manejar escaneo desde cámara
  const handleCameraScan = useCallback((code: string) => {
    setModoCamara(false)
    setCodigo(code)
    buscarYVerificar(code)
  }, [buscarYVerificar])

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
          toast.warning("Este bien ya fue verificado en esta sesión", {
            description: `Código: ${codigo.trim()}`,
          })
        } else {
          toast.error(data.error || "Error al guardar verificación")
        }
        setDialogOpen(false)
        setCodigo("")
        return
      }

      // Éxito - cerrar diálogo y recargar
      setDialogOpen(false)
      setCodigo("")
      setBienEncontrado(null)
      toast.success("Verificación registrada", {
        description: `${codigo.trim()} — ${formVerificacion.resultado}`,
      })
      await Promise.all([cargarSesion(), cargarVerificaciones()])

      // Focus en input para siguiente escaneo
      if (inputRef.current) {
        inputRef.current.focus()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar")
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
      toast.error(err instanceof Error ? err.message : "Error al ejecutar acción")
    }
  }

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; label: string }> = {
      PROGRAMADA: { color: "bg-blue-100 text-blue-800", label: "Programada" },
      EN_PROCESO: { color: "bg-green-100 text-green-800", label: "En Proceso" },
      PAUSADA: { color: "bg-yellow-100 text-yellow-800", label: "Pausada" },
      FINALIZADA: { color: "bg-gray-100 text-gray-800", label: "Finalizada" },
      CANCELADA: { color: "bg-red-100 text-red-800", label: "Cancelada" },
    }
    const cfg = config[estado] || config.PROGRAMADA
    return <Badge className={`${cfg.color} text-xs`}>{cfg.label}</Badge>
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
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/dashboard/patrimonio/inventario")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">
                {sesion.codigo}
              </Badge>
              {getEstadoBadge(sesion.estado)}
            </div>
            <h1 className="text-base sm:text-xl font-bold truncate">{sesion.nombre}</h1>
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            {(sesion.estado === "EN_PROCESO") && (
              <Button
                variant="outline"
                size="icon"
                className="sm:w-auto sm:px-3"
                onClick={() => handleAccionSesion("pausar")}
              >
                <Pause className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Pausar</span>
              </Button>
            )}
            {(sesion.estado === "EN_PROCESO" || sesion.estado === "PAUSADA") && (
              <Button
                size="icon"
                className="sm:w-auto sm:px-3"
                onClick={() => handleAccionSesion("finalizar")}
              >
                <Check className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Finalizar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground">Progreso</span>
              <span className="text-xs sm:text-sm font-medium">
                {sesion.totalVerificados}{sesion.totalBienesSiga > 0 ? ` / ${sesion.totalBienesSiga}` : ""} verificados
              </span>
            </div>
            <Progress value={progreso} className="h-2.5 sm:h-3 mb-2 sm:mb-3" />
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
              <div className="p-1.5 sm:p-2 rounded bg-green-50">
                <p className="font-bold text-sm sm:text-base text-green-700">{sesion.totalEncontrados}</p>
                <p className="text-[10px] sm:text-xs text-green-600">Encontrados</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded bg-blue-50">
                <p className="font-bold text-sm sm:text-base text-blue-700">{sesion.totalReubicados}</p>
                <p className="text-[10px] sm:text-xs text-blue-600">Reubicados</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded bg-red-50">
                <p className="font-bold text-sm sm:text-base text-red-700">{sesion.totalNoEncontrados}</p>
                <p className="text-[10px] sm:text-xs text-red-600">Faltantes</p>
              </div>
              <div className="p-1.5 sm:p-2 rounded bg-yellow-50">
                <p className="font-bold text-sm sm:text-base text-yellow-700">{sesion.totalSobrantes}</p>
                <p className="text-[10px] sm:text-xs text-yellow-600">Sobrantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="verificacion" onValueChange={(tab) => {
        if (tab === "bienes-esperados" && bienesEsperados.length === 0 && sesion.sigaCentroCosto) {
          cargarBienesEsperados(1)
        }
        if (tab === "reporte-usuarios" && resumenUsuarios.length === 0 && sesion.sigaCentroCosto) {
          cargarReporteUsuarios()
        }
      }}>
        <TabsList className="w-full grid grid-cols-3 sm:flex sm:w-auto sm:justify-start">
          <TabsTrigger value="verificacion" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <Barcode className="h-4 w-4 shrink-0" />
            <span className="truncate">Verificar</span>
          </TabsTrigger>
          {sesion.sigaCentroCosto && (
            <TabsTrigger value="bienes-esperados" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
              <ListChecks className="h-4 w-4 shrink-0" />
              <span className="truncate">Bienes</span>
            </TabsTrigger>
          )}
          {sesion.sigaCentroCosto && (
            <TabsTrigger value="reporte-usuarios" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">Usuarios</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Verificación */}
        <TabsContent value="verificacion" className="space-y-4 mt-4">
          {/* Botón cámara prominente en móvil */}
          <Button
            variant="outline"
            onClick={() => setModoCamara(true)}
            className="w-full h-14 gap-3 text-base sm:hidden border-dashed border-2"
          >
            <Camera className="h-5 w-5" />
            Escanear con Cámara
          </Button>

          {/* Scanner */}
          <Card className={modoEscaner ? "border-blue-200 bg-blue-50" : ""}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Barcode className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <span className="text-sm sm:text-base font-medium">Código Patrimonial</span>
                  </div>
                  <form onSubmit={handleBuscar} className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Ingrese o escanee..."
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="font-mono text-base sm:text-lg h-11 sm:h-12"
                      maxLength={12}
                      autoComplete="off"
                    />
                    <Button type="submit" disabled={scanning || !codigo.trim()} className="h-11 sm:h-12 px-4 sm:px-6">
                      {scanning ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Search className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                </div>
                <div className="hidden sm:flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setModoCamara(true)}
                    className="h-12 gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Cámara
                  </Button>
                  <Button
                    variant={modoEscaner ? "default" : "outline"}
                    onClick={() => setModoEscaner(!modoEscaner)}
                    className="h-12 gap-2"
                  >
                    <Barcode className="h-4 w-4" />
                    {modoEscaner ? "Escáner Activo" : "Pistola"}
                  </Button>
                </div>
                {/* Botones compactos en móvil */}
                <div className="flex gap-2 sm:hidden">
                  <Button
                    variant={modoEscaner ? "default" : "outline"}
                    onClick={() => setModoEscaner(!modoEscaner)}
                    className="flex-1 h-10 gap-2 text-sm"
                  >
                    <Barcode className="h-4 w-4" />
                    {modoEscaner ? "Escáner Activo" : "Modo Pistola"}
                  </Button>
                </div>
              </div>
              {modoEscaner && (
                <p className="text-xs sm:text-sm text-blue-600 mt-2">
                  Modo pistola activado. Escanea el código de barras para verificar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Verifications */}
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base">Verificaciones Recientes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Últimos bienes verificados</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={cargarVerificaciones}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {verificaciones.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-50" />
                  <p className="text-sm">No hay verificaciones registradas</p>
                  <p className="text-xs text-muted-foreground">Escanea un código para comenzar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">Descripción</TableHead>
                        <TableHead className="text-xs">Resultado</TableHead>
                        <TableHead className="hidden md:table-cell text-xs">Estado Físico</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs">Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {verificaciones.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs sm:text-sm py-2">
                            <div>{v.codigoPatrimonial}</div>
                            <div className="sm:hidden text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {v.descripcionSiga || "Sin info"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-sm">
                            {v.descripcionSiga || "Sin información"}
                          </TableCell>
                          <TableCell className="py-2">{getResultadoBadge(v.resultado)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
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
        </TabsContent>

        {/* Tab: Bienes Esperados */}
        {sesion.sigaCentroCosto && (
          <TabsContent value="bienes-esperados" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-sm sm:text-base">Bienes Esperados de SIGA</CardTitle>
                    <CardDescription className="text-xs sm:text-sm truncate">
                      {bienesTotal} bienes — {sesion.sigaNombreDependencia || sesion.sigaCentroCosto}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => cargarBienesEsperados(bienesPage)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingBienes ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : bienesEsperados.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No se encontraron bienes</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[32px] sm:w-[40px] text-center text-xs px-1 sm:px-2">Ok</TableHead>
                            <TableHead className="text-xs">Código</TableHead>
                            <TableHead className="text-xs">Descripción</TableHead>
                            <TableHead className="hidden md:table-cell text-xs">Usuario</TableHead>
                            <TableHead className="hidden lg:table-cell text-xs">Marca</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bienesEsperados.map((bien) => (
                            <TableRow key={bien.codigo_patrimonial}>
                              <TableCell className="text-center px-1 sm:px-2 py-2">
                                {bien.verificado ? (
                                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap py-2">
                                {bien.codigo_patrimonial}
                              </TableCell>
                              <TableCell className="max-w-[150px] sm:max-w-[250px] py-2">
                                <div className="truncate text-xs sm:text-sm">{bien.descripcion}</div>
                                {bien.resultado_verificacion && (
                                  <div className="mt-0.5">
                                    {getResultadoBadge(bien.resultado_verificacion)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                                {bien.usuario || bien.responsable || "—"}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {bien.marca || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Paginación */}
                    {bienesTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cargarBienesEsperados(bienesPage - 1)}
                          disabled={bienesPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Anterior</span>
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {bienesPage} de {bienesTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cargarBienesEsperados(bienesPage + 1)}
                          disabled={bienesPage === bienesTotalPages}
                        >
                          <span className="hidden sm:inline mr-1">Siguiente</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Reporte por Usuario */}
        {sesion.sigaCentroCosto && (
          <TabsContent value="reporte-usuarios" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Reporte por Usuario Final</CardTitle>
                    <CardDescription>
                      Avance de verificación por cada usuario responsable
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={cargarReporteUsuarios}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {loadingReporte ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : resumenUsuarios.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    <Users className="mx-auto h-10 w-10 mb-2 opacity-50" />
                    <p>No se encontraron usuarios</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resumenUsuarios.map((usuario) => (
                      <div key={usuario.empleado_final || usuario.usuario_nombre || "sin-asignar"}>
                        <Card
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => cargarBienesDeUsuario(usuario.empleado_final)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="rounded-full bg-primary/10 p-2">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {usuario.usuario_nombre || "Sin asignar"}
                                  </p>
                                  {usuario.docum_ident && (
                                    <p className="text-xs text-muted-foreground">
                                      DNI: {usuario.docum_ident}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-bold">
                                    {usuario.total_verificados} / {usuario.total_bienes}
                                  </p>
                                  <p className="text-xs text-muted-foreground">verificados</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Descargar Anexo 7"
                                  onClick={(e) =>
                                    descargarAnexo7(
                                      usuario.empleado_final,
                                      usuario.usuario_nombre || usuario.empleado_final,
                                      e
                                    )
                                  }
                                >
                                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                </Button>
                                {usuarioExpandido === usuario.empleado_final ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <Progress
                              value={usuario.porcentaje}
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                              {usuario.porcentaje}%
                            </p>
                          </CardContent>
                        </Card>

                        {/* Bienes expandidos del usuario */}
                        {usuarioExpandido === usuario.empleado_final && (
                          <Card className="mt-1 ml-4 border-l-4 border-l-primary/30">
                            <CardContent className="p-0">
                              {loadingBienesUsuario ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : bienesUsuario.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  No se encontraron bienes
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[40px] text-center">Estado</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead className="hidden md:table-cell">Marca</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {bienesUsuario.map((bien) => (
                                        <TableRow key={bien.codigo_patrimonial}>
                                          <TableCell className="text-center">
                                            {bien.verificado ? (
                                              <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                                            )}
                                          </TableCell>
                                          <TableCell className="font-mono text-xs">
                                            {bien.codigo_patrimonial}
                                          </TableCell>
                                          <TableCell className="max-w-[200px] truncate text-sm">
                                            {bien.descripcion}
                                          </TableCell>
                                          <TableCell className="hidden md:table-cell text-sm">
                                            {bien.marca || "—"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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

      {/* Escáner de cámara (modal fullscreen) */}
      {modoCamara && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setModoCamara(false)}
        />
      )}
    </div>
  )
}
