"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Search,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ReporteConfig {
  id: string
  nombre: string
  descripcion: string
  icono: React.ElementType
  color: string
  tipo: string
  filtros?: string[]
}

interface Dependencia {
  id: string
  nombre: string
  siglas: string | null
}

interface ReporteData {
  tipo: string
  titulo: string
  total: number
  columnas: string[]
  datos: Record<string, unknown>[]
}

const reportesDisponibles: ReporteConfig[] = [
  {
    id: "usuarios",
    nombre: "Reporte de Usuarios",
    descripcion: "Lista completa de usuarios del sistema con sus roles, cargos y estadísticas de actividad",
    icono: Users,
    color: "bg-blue-500",
    tipo: "usuarios",
  },
  {
    id: "sesiones",
    nombre: "Reporte de Sesiones de Inventario",
    descripcion: "Todas las sesiones de inventario con estado, avance y resultados de verificación",
    icono: ClipboardList,
    color: "bg-emerald-500",
    tipo: "sesiones",
    filtros: ["estado", "dependencia", "fechas"],
  },
  {
    id: "dependencias",
    nombre: "Reporte de Dependencias",
    descripcion: "Dependencias del sistema con cantidad de usuarios, sesiones y resultados acumulados",
    icono: Building2,
    color: "bg-purple-500",
    tipo: "dependencias",
  },
  {
    id: "sedes",
    nombre: "Reporte de Sedes",
    descripcion: "Sedes institucionales con sus dependencias y estadísticas de inventario",
    icono: MapPin,
    color: "bg-amber-500",
    tipo: "sedes",
  },
  {
    id: "verificaciones",
    nombre: "Reporte de Verificaciones",
    descripcion: "Detalle de todas las verificaciones realizadas con resultados y observaciones",
    icono: CheckCircle,
    color: "bg-teal-500",
    tipo: "verificaciones",
    filtros: ["sesion", "resultado"],
  },
  {
    id: "resumen",
    nombre: "Resumen General",
    descripcion: "Estadísticas consolidadas de todo el sistema en un solo reporte",
    icono: BarChart3,
    color: "bg-rose-500",
    tipo: "resumen",
  },
]

export default function ReportesPage() {
  const [loading, setLoading] = useState(false)
  const [loadingDependencias, setLoadingDependencias] = useState(true)
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteConfig | null>(null)
  const [previewData, setPreviewData] = useState<ReporteData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [generando, setGenerando] = useState(false)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState("all")
  const [filtroDependencia, setFiltroDependencia] = useState("all")
  const [filtroResultado, setFiltroResultado] = useState("all")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")

  useEffect(() => {
    fetchDependencias()
  }, [])

  const fetchDependencias = async () => {
    try {
      const response = await fetch("/api/dependencias/all")
      if (response.ok) {
        const data = await response.json()
        setDependencias(data.dependencias || data || [])
      }
    } catch (error) {
      console.error("Error al cargar dependencias:", error)
    } finally {
      setLoadingDependencias(false)
    }
  }

  const construirUrlReporte = (tipo: string) => {
    const params = new URLSearchParams()
    params.set("tipo", tipo)

    if (tipo === "sesiones") {
      if (filtroEstado !== "all") params.set("estado", filtroEstado)
      if (filtroDependencia !== "all") params.set("dependenciaId", filtroDependencia)
      if (fechaInicio) params.set("fechaInicio", fechaInicio)
      if (fechaFin) params.set("fechaFin", fechaFin)
    }

    if (tipo === "verificaciones") {
      if (filtroResultado !== "all") params.set("resultado", filtroResultado)
    }

    return `/api/reportes?${params.toString()}`
  }

  const generarVistaPrevia = async (reporte: ReporteConfig) => {
    setReporteSeleccionado(reporte)
    setLoading(true)
    setShowPreview(true)

    try {
      const url = construirUrlReporte(reporte.tipo)
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setPreviewData(data)
      }
    } catch (error) {
      console.error("Error al generar vista previa:", error)
    } finally {
      setLoading(false)
    }
  }

  const exportarExcel = async (reporte: ReporteConfig) => {
    setGenerando(true)

    try {
      const url = construirUrlReporte(reporte.tipo)
      const response = await fetch(url)

      if (!response.ok) throw new Error("Error al obtener datos")

      const data: ReporteData = await response.json()

      // Crear workbook
      const wb = XLSX.utils.book_new()

      // Crear hoja con los datos
      const ws = XLSX.utils.json_to_sheet(data.datos, {
        header: data.columnas,
      })

      // Ajustar ancho de columnas
      const colWidths = data.columnas.map((col) => ({
        wch: Math.max(
          col.length,
          ...data.datos.map((row) => String(row[col] || "").length)
        ) + 2,
      }))
      ws["!cols"] = colWidths

      // Agregar la hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, "Datos")

      // Crear hoja de información
      const infoData = [
        ["UNIVERSIDAD NACIONAL AMAZÓNICA DE MADRE DE DIOS"],
        ["SISTEMA DE GESTIÓN DE PATRIMONIO"],
        [""],
        ["REPORTE:", data.titulo],
        ["FECHA DE GENERACIÓN:", new Date().toLocaleString("es-PE")],
        ["TOTAL DE REGISTROS:", data.total],
        [""],
        ["Generado por el Sistema de Patrimonio UNAMAD"],
      ]
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
      wsInfo["!cols"] = [{ wch: 50 }]
      XLSX.utils.book_append_sheet(wb, wsInfo, "Información")

      // Generar archivo y descargar
      const fecha = new Date().toISOString().split("T")[0]
      const filename = `reporte_${reporte.tipo}_${fecha}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error("Error al exportar:", error)
      alert("Error al generar el archivo Excel")
    } finally {
      setGenerando(false)
    }
  }

  const exportarPreviewExcel = () => {
    if (!previewData || !reporteSeleccionado) return

    setGenerando(true)

    try {
      const wb = XLSX.utils.book_new()

      const ws = XLSX.utils.json_to_sheet(previewData.datos, {
        header: previewData.columnas,
      })

      const colWidths = previewData.columnas.map((col) => ({
        wch: Math.max(
          col.length,
          ...previewData.datos.slice(0, 100).map((row) => String(row[col] || "").length)
        ) + 2,
      }))
      ws["!cols"] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, "Datos")

      const infoData = [
        ["UNIVERSIDAD NACIONAL AMAZÓNICA DE MADRE DE DIOS"],
        ["SISTEMA DE GESTIÓN DE PATRIMONIO"],
        [""],
        ["REPORTE:", previewData.titulo],
        ["FECHA DE GENERACIÓN:", new Date().toLocaleString("es-PE")],
        ["TOTAL DE REGISTROS:", previewData.total],
      ]
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
      XLSX.utils.book_append_sheet(wb, wsInfo, "Información")

      const fecha = new Date().toISOString().split("T")[0]
      XLSX.writeFile(wb, `reporte_${reporteSeleccionado.tipo}_${fecha}.xlsx`)
    } catch (error) {
      console.error("Error al exportar:", error)
    } finally {
      setGenerando(false)
    }
  }

  const limpiarFiltros = () => {
    setFiltroEstado("all")
    setFiltroDependencia("all")
    setFiltroResultado("all")
    setFechaInicio("")
    setFechaFin("")
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Centro de Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Genera reportes profesionales en formato Excel del sistema de patrimonio
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <FileSpreadsheet className="h-3 w-3 mr-1" />
          Formato Excel (.xlsx)
        </Badge>
      </div>

      {/* Filtros Globales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros de Reporte
          </CardTitle>
          <CardDescription>
            Configura los filtros antes de generar los reportes de Sesiones y Verificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado de Sesión</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PROGRAMADA">Programada</SelectItem>
                  <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                  <SelectItem value="PAUSADA">Pausada</SelectItem>
                  <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dependencia">Dependencia</Label>
              <Select value={filtroDependencia} onValueChange={setFiltroDependencia}>
                <SelectTrigger id="dependencia">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {dependencias.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {dep.siglas || dep.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultado">Resultado Verificación</Label>
              <Select value={filtroResultado} onValueChange={setFiltroResultado}>
                <SelectTrigger id="resultado">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
                  <SelectItem value="NO_ENCONTRADO">No Encontrado</SelectItem>
                  <SelectItem value="REUBICADO">Reubicado</SelectItem>
                  <SelectItem value="SOBRANTE">Sobrante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={limpiarFiltros}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Reportes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportesDisponibles.map((reporte) => (
          <Card key={reporte.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg ${reporte.color} p-2.5 text-white`}>
                  <reporte.icono className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{reporte.nombre}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {reporte.descripcion}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => generarVistaPrevia(reporte)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => exportarExcel(reporte)}
                  disabled={generando}
                >
                  {generando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Excel
                </Button>
              </div>
              {reporte.filtros && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Usa los filtros superiores para personalizar
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información de Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Usuarios</p>
                <p className="text-xs text-muted-foreground">
                  Incluye roles, cargos, dependencias y estadísticas de actividad
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <ClipboardList className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Sesiones</p>
                <p className="text-xs text-muted-foreground">
                  Estado, avance, fechas y resultados de cada sesión de inventario
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Dependencias</p>
                <p className="text-xs text-muted-foreground">
                  Usuarios asignados, sesiones realizadas y resultados acumulados
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Sedes</p>
                <p className="text-xs text-muted-foreground">
                  Cantidad de dependencias, sesiones y verificaciones por sede
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle className="h-5 w-5 text-teal-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Verificaciones</p>
                <p className="text-xs text-muted-foreground">
                  Detalle completo de cada verificación con ubicaciones y observaciones
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <BarChart3 className="h-5 w-5 text-rose-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Resumen</p>
                <p className="text-xs text-muted-foreground">
                  Estadísticas consolidadas de todo el sistema en un solo archivo
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Vista Previa */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reporteSeleccionado && (
                <>
                  <reporteSeleccionado.icono className="h-5 w-5" />
                  {previewData?.titulo || reporteSeleccionado.nombre}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {previewData
                ? `${previewData.total} registros encontrados`
                : "Cargando datos..."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewData ? (
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewData.columnas.slice(0, 8).map((col) => (
                        <TableHead key={col} className="whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                      {previewData.columnas.length > 8 && (
                        <TableHead className="text-muted-foreground">
                          +{previewData.columnas.length - 8} columnas más
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.datos.slice(0, 15).map((row, idx) => (
                      <TableRow key={idx}>
                        {previewData.columnas.slice(0, 8).map((col) => (
                          <TableCell key={col} className="max-w-[200px] truncate">
                            {String(row[col] ?? "")}
                          </TableCell>
                        ))}
                        {previewData.columnas.length > 8 && (
                          <TableCell className="text-muted-foreground">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.datos.length > 15 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30 border-t">
                    Mostrando 15 de {previewData.total} registros. Descarga el Excel para ver todos.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron datos
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cerrar
            </Button>
            <Button onClick={exportarPreviewExcel} disabled={generando || !previewData}>
              {generando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar Excel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
