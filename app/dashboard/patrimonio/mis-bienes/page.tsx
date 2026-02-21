"use client"

import { useState, useEffect, useCallback } from "react"
import {
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
  Truck,
  Tag,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  PackageOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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

interface UsuarioInfo {
  nombre: string
  documento: string
}

export default function MisBienesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bienes, setBienes] = useState<BienPatrimonial[]>([])
  const [usuario, setUsuario] = useState<UsuarioInfo | null>(null)
  const [bienSeleccionado, setBienSeleccionado] = useState<BienPatrimonial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 10

  const cargarMisBienes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/patrimonio/mis-bienes")
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al cargar los bienes")
        return
      }

      setBienes(data.bienes)
      setUsuario(data.usuario)
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarMisBienes()
  }, [cargarMisBienes])

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value)
  }

  // Calcular valor total de bienes
  const valorTotal = bienes.reduce((acc, bien) => acc + (bien.valor_neto || 0), 0)

  // Paginación
  const totalPaginas = Math.ceil(bienes.length / itemsPorPagina)
  const indiceInicio = (paginaActual - 1) * itemsPorPagina
  const indiceFin = indiceInicio + itemsPorPagina
  const bienesPaginados = bienes.slice(indiceInicio, indiceFin)

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mis Bienes Patrimoniales</h1>
          <p className="text-sm text-muted-foreground">
            Bienes asignados a tu cargo según SIGA
          </p>
        </div>
        <Button
          variant="outline"
          onClick={cargarMisBienes}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Info del usuario y resumen */}
      {usuario && !loading && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#1e3a5f] p-2">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="font-medium text-sm">{usuario.nombre}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Bienes</p>
                  <p className="font-bold text-lg">{bienes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-600 p-2">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total Neto</p>
                  <p className="font-bold text-lg text-green-700">{formatCurrency(valorTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="mx-auto h-12 w-12 text-muted-foreground animate-spin" />
            <p className="mt-4 text-muted-foreground">Cargando tus bienes...</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cargarMisBienes}
              className="mt-3"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sin bienes */}
      {!loading && !error && bienes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 sm:p-12 text-center">
            <PackageOpen className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-base sm:text-lg font-medium">No tienes bienes asignados</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No se encontraron bienes patrimoniales registrados a tu nombre en SIGA
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de bienes */}
      {!loading && !error && bienes.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">
                Listado de Bienes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Mostrando {indiceInicio + 1}-{Math.min(indiceFin, bienes.length)} de {bienes.length}
              </p>
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
                    <TableHead className="hidden lg:table-cell">Ubicación</TableHead>
                    <TableHead className="hidden sm:table-cell">Marca</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Valor Neto</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bienesPaginados.map((item) => (
                    <TableRow
                      key={item.codigo_patrimonial}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setBienSeleccionado(item)
                        setModalOpen(true)
                      }}
                    >
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
                        {item.ubicacion_fisica || "N/A"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {item.marca || "N/A"}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell font-medium">
                        {formatCurrency(item.valor_neto)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
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
    </div>
  )
}
