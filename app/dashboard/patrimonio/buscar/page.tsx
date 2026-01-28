"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Search,
  Loader2,
  Package,
  MapPin,
  Building2,
  User,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Barcode,
  Info,
  Calendar,
  DollarSign,
  Hash,
  FileText,
  Truck,
  Tag,
  ChevronLeft,
  ChevronRight,
  IdCard,
  Camera,
  Usb,
  Wifi,
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BienPatrimonial {
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
  color: string | null
  medidas: string | null
  caracteristicas: string | null
  fecha_alta: string | null
  fecha_compra: string | null
  valor_compra: number | null
  valor_inicial: number | null
  valor_neto: number | null
  nombre_item: string | null
  codigo_barra: string | null
  centro_costo: string | null
  abreviatura: string | null
  observaciones: string | null
  proveedor: string | null
}

export default function BuscarBienPage() {
  const [codigo, setCodigo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [documento, setDocumento] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bien, setBien] = useState<BienPatrimonial | null>(null)
  const [bienes, setBienes] = useState<BienPatrimonial[]>([])
  const [modoEscaner, setModoEscaner] = useState(false)
  const [modoCamara, setModoCamara] = useState(false)
  const [escanerDetectado, setEscanerDetectado] = useState(false)
  const [bienSeleccionado, setBienSeleccionado] = useState<BienPatrimonial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const [personaBusqueda, setPersonaBusqueda] = useState<string | null>(null)
  const itemsPorPagina = 10
  const inputRef = useRef<HTMLInputElement>(null)
  const lastInputTime = useRef<number>(0)
  const inputBuffer = useRef<string>("")
  const escanerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useIsMobile()

  // Buscar por código patrimonial
  const buscarPorCodigo = useCallback(async (codigoBuscar: string) => {
    if (!codigoBuscar.trim()) return

    setLoading(true)
    setError(null)
    setBien(null)
    setBienes([])
    setPersonaBusqueda(null)

    try {
      const response = await fetch(
        `/api/patrimonio/buscar?codigo=${encodeURIComponent(codigoBuscar.trim())}`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al buscar")
        return
      }

      setBien(data.bien)
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar por descripción
  const buscarPorDescripcion = async () => {
    if (!descripcion.trim()) return

    setLoading(true)
    setError(null)
    setPaginaActual(1)
    setBien(null)
    setBienes([])
    setPersonaBusqueda(null)

    try {
      const response = await fetch(
        `/api/patrimonio/buscar?descripcion=${encodeURIComponent(descripcion.trim())}`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al buscar")
        return
      }

      setBienes(data.bienes)
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }

  // Buscar por número de documento (DNI)
  const buscarPorDocumento = async () => {
    if (!documento.trim()) return

    setLoading(true)
    setError(null)
    setPaginaActual(1)
    setBien(null)
    setBienes([])
    setPersonaBusqueda(null)

    try {
      const response = await fetch(
        `/api/patrimonio/buscar?documento=${encodeURIComponent(documento.trim())}`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al buscar")
        return
      }

      setBienes(data.bienes)
      // Obtener el nombre del responsable/usuario del primer resultado
      if (data.bienes.length > 0) {
        const primerBien = data.bienes[0]
        setPersonaBusqueda(primerBien.responsable || primerBien.usuario || null)
      }
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarPorDocumento()
  }

  // Detectar entrada de escáner (entrada rápida)
  useEffect(() => {
    if (!modoEscaner) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const timeDiff = now - lastInputTime.current

      // Si el tiempo entre teclas es muy corto (<50ms), es un escáner
      if (timeDiff < 50 && inputBuffer.current.length > 0) {
        // Detectar que hay un escáner USB activo
        if (!escanerDetectado) {
          setEscanerDetectado(true)
        }
        // Reiniciar timeout para ocultar indicador
        if (escanerTimeoutRef.current) {
          clearTimeout(escanerTimeoutRef.current)
        }
        escanerTimeoutRef.current = setTimeout(() => {
          setEscanerDetectado(false)
        }, 3000)
      } else if (timeDiff > 200) {
        // Reset buffer si pasó mucho tiempo
        inputBuffer.current = ""
      }

      if (e.key === "Enter") {
        // Cuando el escáner envía Enter, buscar
        if (inputBuffer.current.length >= 10) {
          setCodigo(inputBuffer.current)
          buscarPorCodigo(inputBuffer.current)
        }
        inputBuffer.current = ""
        e.preventDefault()
      } else if (e.key.length === 1) {
        inputBuffer.current += e.key
      }

      lastInputTime.current = now
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (escanerTimeoutRef.current) {
        clearTimeout(escanerTimeoutRef.current)
      }
    }
  }, [modoEscaner, buscarPorCodigo, escanerDetectado])

  // Manejar escaneo desde cámara
  const handleCameraScan = useCallback((code: string) => {
    setModoCamara(false)
    setCodigo(code)
    buscarPorCodigo(code)
  }, [buscarPorCodigo])

  // Focus en input al cambiar a modo escáner
  useEffect(() => {
    if (modoEscaner && inputRef.current) {
      inputRef.current.focus()
    }
  }, [modoEscaner])

  const handleCodigoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarPorCodigo(codigo)
  }

  const handleDescripcionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarPorDescripcion()
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Buscar Bien Patrimonial</h1>
          <p className="text-sm text-muted-foreground">
            Consulta información de bienes desde SIGA
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botón escáner USB */}
          <Button
            variant={modoEscaner ? "default" : "outline"}
            onClick={() => setModoEscaner(!modoEscaner)}
            className="gap-2"
          >
            <Usb className="h-4 w-4" />
            <span className="hidden sm:inline">
              {modoEscaner ? "Escáner USB Activo" : "Escáner USB"}
            </span>
            <span className="sm:hidden">USB</span>
            {escanerDetectado && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </Button>

          {/* Botón cámara - visible siempre pero resaltado en móvil */}
          <Button
            variant={isMobile ? "default" : "outline"}
            onClick={() => setModoCamara(true)}
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Cámara</span>
          </Button>
        </div>
      </div>

      {/* Alerta modo escáner USB */}
      {modoEscaner && (
        <Card className={escanerDetectado ? "border-green-300 bg-green-50" : "border-blue-200 bg-blue-50"}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              {escanerDetectado ? (
                <>
                  <div className="relative">
                    <Usb className="h-5 w-5 text-green-600 mt-0.5" />
                    <Wifi className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800 flex items-center gap-2">
                      Lector USB Detectado
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </p>
                    <p className="text-sm text-green-600">
                      Lector de códigos de barras conectado y funcionando.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Usb className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Modo Escáner USB Activado</p>
                    <p className="text-sm text-blue-600">
                      Conecta tu lector de códigos de barras USB y escanea. La búsqueda se realizará automáticamente.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de búsqueda */}
      <Tabs defaultValue="codigo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="codigo" className="text-xs sm:text-sm">
            <Hash className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Por </span>Código
          </TabsTrigger>
          <TabsTrigger value="descripcion" className="text-xs sm:text-sm">
            <FileText className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Por </span>Descripción
          </TabsTrigger>
          <TabsTrigger value="documento" className="text-xs sm:text-sm">
            <IdCard className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Por </span>DNI
          </TabsTrigger>
        </TabsList>

        {/* Búsqueda por código */}
        <TabsContent value="codigo">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Buscar por Código Patrimonial</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Ingresa el código de 12 dígitos o escanea el código de barras
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleCodigoSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="codigo" className="sr-only">
                    Código Patrimonial
                  </Label>
                  <Input
                    ref={inputRef}
                    id="codigo"
                    placeholder="Ej: 112236140168"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="font-mono text-base sm:text-lg h-11 sm:h-12"
                    maxLength={12}
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" disabled={loading || !codigo.trim()} className="h-11 sm:h-12">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Búsqueda por descripción */}
        <TabsContent value="descripcion">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Buscar por Descripción</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Busca bienes por nombre o descripción parcial
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleDescripcionSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="descripcion" className="sr-only">
                    Descripción
                  </Label>
                  <Input
                    id="descripcion"
                    placeholder="Ej: escritorio, computadora, silla..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="h-11 sm:h-12"
                  />
                </div>
                <Button type="submit" disabled={loading || !descripcion.trim()} className="h-11 sm:h-12">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Búsqueda por número de documento (DNI) */}
        <TabsContent value="documento">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Buscar por Número de Documento</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Consulta los bienes asignados a una persona por su DNI
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleDocumentoSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="documento" className="sr-only">
                    Número de Documento
                  </Label>
                  <Input
                    id="documento"
                    placeholder="Ej: 12345678"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    className="font-mono text-base sm:text-lg h-11 sm:h-12"
                    maxLength={8}
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" disabled={loading || !documento.trim()} className="h-11 sm:h-12">
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Buscar
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado único (búsqueda por código) */}
      {bien && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[#1e3a5f] p-2 sm:p-3">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-mono">
                    {bien.codigo_patrimonial}
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-1">
                    {bien.descripcion}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {bien.codigo_barra && (
                  <Badge variant="outline" className="font-mono">
                    <Barcode className="mr-1 h-3 w-3" />
                    {bien.codigo_barra}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid gap-4 sm:gap-6">
              {/* Ubicación */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Sede</p>
                    <p className="font-medium text-sm">{bien.nombre_sede || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Dependencia</p>
                    <p className="font-medium text-sm">{bien.nombre_depend || "N/A"}</p>
                    {bien.abreviatura && (
                      <p className="text-xs text-muted-foreground">({bien.abreviatura})</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Ubicación Física</p>
                    <p className="font-medium text-sm">{bien.ubicacion_fisica || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Responsables */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Responsable</p>
                    <p className="font-medium text-sm">{bien.responsable || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Usuario Final</p>
                    <p className="font-medium text-sm">{bien.usuario || "N/A"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Información del Bien */}
              <div>
                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Información del Bien
                </h4>
                <div className="p-3 rounded-lg border bg-muted/30 mb-3">
                  <p className="text-xs text-muted-foreground">Nombre del Item</p>
                  <p className="font-medium text-sm">{bien.nombre_item || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="p-2 sm:p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Marca</p>
                    <p className="font-medium text-xs sm:text-sm truncate">{bien.marca || "N/A"}</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Modelo</p>
                    <p className="font-medium text-xs sm:text-sm truncate">{bien.modelo || "N/A"}</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Serie</p>
                    <p className="font-medium text-xs sm:text-sm truncate font-mono">{bien.serie || "N/A"}</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Color</p>
                    <p className="font-medium text-xs sm:text-sm truncate">{bien.color || "N/A"}</p>
                  </div>
                  <div className="p-2 sm:p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Medidas</p>
                    <p className="font-medium text-xs sm:text-sm truncate">{bien.medidas || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Características */}
              {bien.caracteristicas && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Características</p>
                  <p className="text-sm">{bien.caracteristicas}</p>
                </div>
              )}

              <Separator />

              {/* Información de Adquisición */}
              <div>
                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Información de Adquisición
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha Compra</p>
                      <p className="font-medium text-sm">{bien.fecha_compra || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Compra</p>
                      <p className="font-medium text-sm">{formatCurrency(bien.valor_compra)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha Alta</p>
                      <p className="font-medium text-sm">{bien.fecha_alta || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Inicial</p>
                      <p className="font-medium text-sm">{formatCurrency(bien.valor_inicial)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Valor Neto y Proveedor */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-green-600">Valor Neto Actual</p>
                    <p className="font-bold text-lg text-green-800">{formatCurrency(bien.valor_neto)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Proveedor</p>
                    <p className="font-medium text-sm truncate">{bien.proveedor || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {bien.observaciones && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Observaciones</h4>
                    <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                      {bien.observaciones}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados múltiples (búsqueda por descripción o DNI) */}
      {bienes.length > 0 && (() => {
        const totalPaginas = Math.ceil(bienes.length / itemsPorPagina)
        const indiceInicio = (paginaActual - 1) * itemsPorPagina
        const indiceFin = indiceInicio + itemsPorPagina
        const bienesPaginados = bienes.slice(indiceInicio, indiceFin)

        return (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-2">
                {personaBusqueda && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Bienes asignados a: <strong className="text-foreground">{personaBusqueda}</strong></span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">
                    Resultados ({bienes.length} {bienes.length === 1 ? 'bien' : 'bienes'})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Mostrando {indiceInicio + 1}-{Math.min(indiceFin, bienes.length)} de {bienes.length}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="hidden md:table-cell">Dependencia</TableHead>
                      <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                      <TableHead className="hidden sm:table-cell">Marca</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bienesPaginados.map((item) => (
                      <TableRow key={item.codigo_patrimonial}>
                        <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                          {item.codigo_patrimonial}
                        </TableCell>
                        <TableCell className="max-w-[150px] sm:max-w-[200px] truncate">
                          {item.descripcion}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                          {item.abreviatura || item.nombre_depend || "N/A"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[150px] truncate">
                          {item.responsable || "N/A"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {item.marca || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setBienSeleccionado(item)
                              setModalOpen(true)
                            }}
                          >
                            <Search className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">Ver</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Controles de paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t sm:px-6">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Anterior</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual === totalPaginas}
                    >
                      <span className="hidden sm:inline mr-1">Siguiente</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let pageNum: number
                      if (totalPaginas <= 5) {
                        pageNum = i + 1
                      } else if (paginaActual <= 3) {
                        pageNum = i + 1
                      } else if (paginaActual >= totalPaginas - 2) {
                        pageNum = totalPaginas - 4 + i
                      } else {
                        pageNum = paginaActual - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={paginaActual === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setPaginaActual(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Sin resultados */}
      {!loading && !error && !bien && bienes.length === 0 && (codigo || descripcion) && (
        <Card className="border-dashed">
          <CardContent className="p-6 sm:p-12 text-center">
            <Search className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-base sm:text-lg font-medium">Ingresa un criterio de búsqueda</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Usa el código patrimonial o la descripción para buscar bienes en SIGA
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalle del bien */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-5xl w-[90vw] max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="rounded-lg bg-[#1e3a5f] p-2">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-mono">{bienSeleccionado?.codigo_patrimonial}</span>
                {bienSeleccionado?.codigo_barra && (
                  <Badge variant="outline" className="ml-2 font-mono text-xs">
                    <Barcode className="mr-1 h-3 w-3" />
                    {bienSeleccionado.codigo_barra}
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {bienSeleccionado && (
              <div className="p-4 sm:p-6 pt-4 space-y-4">
                {/* Descripción */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="font-medium">{bienSeleccionado.descripcion}</p>
                </div>

                {/* Ubicación */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Sede</p>
                      <p className="font-medium text-sm">{bienSeleccionado.nombre_sede || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Dependencia</p>
                      <p className="font-medium text-sm">{bienSeleccionado.nombre_depend || "N/A"}</p>
                      {bienSeleccionado.abreviatura && (
                        <p className="text-xs text-muted-foreground">({bienSeleccionado.abreviatura})</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Ubicación Física</p>
                      <p className="font-medium text-sm">{bienSeleccionado.ubicacion_fisica || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Responsables */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Responsable</p>
                      <p className="font-medium text-sm">{bienSeleccionado.responsable || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Usuario Final</p>
                      <p className="font-medium text-sm">{bienSeleccionado.usuario || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Información del Bien */}
                <div>
                  <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Información del Bien
                  </h4>
                  <div className="p-3 rounded-lg border bg-muted/30 mb-3">
                    <p className="text-xs text-muted-foreground">Nombre del Item</p>
                    <p className="font-medium text-sm">{bienSeleccionado.nombre_item || "N/A"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div className="p-2 sm:p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Marca</p>
                      <p className="font-medium text-xs sm:text-sm truncate">{bienSeleccionado.marca || "N/A"}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Modelo</p>
                      <p className="font-medium text-xs sm:text-sm truncate">{bienSeleccionado.modelo || "N/A"}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Serie</p>
                      <p className="font-medium text-xs sm:text-sm truncate font-mono">{bienSeleccionado.serie || "N/A"}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Color</p>
                      <p className="font-medium text-xs sm:text-sm truncate">{bienSeleccionado.color || "N/A"}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Medidas</p>
                      <p className="font-medium text-xs sm:text-sm truncate">{bienSeleccionado.medidas || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Características */}
                {bienSeleccionado.caracteristicas && (
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">Características</p>
                    <p className="text-sm">{bienSeleccionado.caracteristicas}</p>
                  </div>
                )}

                <Separator />

                {/* Información de Adquisición */}
                <div>
                  <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Información de Adquisición
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha Compra</p>
                        <p className="font-medium text-sm">{bienSeleccionado.fecha_compra || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Compra</p>
                        <p className="font-medium text-sm">{formatCurrency(bienSeleccionado.valor_compra)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha Alta</p>
                        <p className="font-medium text-sm">{bienSeleccionado.fecha_alta || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border">
                      <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Inicial</p>
                        <p className="font-medium text-sm">{formatCurrency(bienSeleccionado.valor_inicial)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valor Neto y Proveedor */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-600">Valor Neto Actual</p>
                      <p className="font-bold text-lg text-green-800">{formatCurrency(bienSeleccionado.valor_neto)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Proveedor</p>
                      <p className="font-medium text-sm truncate">{bienSeleccionado.proveedor || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {bienSeleccionado.observaciones && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Observaciones</h4>
                      <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                        {bienSeleccionado.observaciones}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
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
