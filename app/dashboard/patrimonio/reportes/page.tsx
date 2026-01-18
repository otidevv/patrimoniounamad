"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  ClipboardList,
  Package,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  TrendingUp,
  PieChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Sesion {
  id: string
  codigo: string
  nombre: string
  estado: string
  fechaProgramada: string
  fechaInicio: string | null
  fechaFin: string | null
  totalBienesSiga: number
  totalVerificados: number
  totalEncontrados: number
  totalReubicados: number
  totalNoEncontrados: number
  totalSobrantes: number
  dependencia: { id: string; nombre: string; siglas: string | null } | null
  sede: { id: string; nombre: string } | null
  responsable: { id: string; nombre: string; apellidos: string }
}

interface Dependencia {
  id: string
  nombre: string
  siglas: string | null
}

interface EstadisticasGenerales {
  totalSesiones: number
  sesionesFinalizadas: number
  sesionesEnProceso: number
  totalVerificaciones: number
  bienesEncontrados: number
  bienesReubicados: number
  bienesNoEncontrados: number
  bienesSobrantes: number
}

export default function ReportesPage() {
  const [loading, setLoading] = useState(true)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>("all")
  const [filtroDependencia, setFiltroDependencia] = useState<string>("all")
  const [exportando, setExportando] = useState(false)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [sesionesRes, depRes] = await Promise.all([
        fetch("/api/inventario/sesiones?limit=1000"),
        fetch("/api/dependencias/all"),
      ])

      const [sesionesData, depData] = await Promise.all([
        sesionesRes.json(),
        depRes.json(),
      ])

      if (sesionesRes.ok) setSesiones(sesionesData.sesiones || [])
      if (depRes.ok) setDependencias(depData.dependencias || depData || [])
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // Filtrar sesiones
  const sesionesFiltradas = sesiones.filter((s) => {
    if (filtroEstado !== "all" && s.estado !== filtroEstado) return false
    if (filtroDependencia !== "all" && s.dependencia?.id !== filtroDependencia) return false
    return true
  })

  // Calcular estadísticas
  const estadisticas: EstadisticasGenerales = {
    totalSesiones: sesionesFiltradas.length,
    sesionesFinalizadas: sesionesFiltradas.filter((s) => s.estado === "FINALIZADA").length,
    sesionesEnProceso: sesionesFiltradas.filter((s) => s.estado === "EN_PROCESO").length,
    totalVerificaciones: sesionesFiltradas.reduce((acc, s) => acc + s.totalVerificados, 0),
    bienesEncontrados: sesionesFiltradas.reduce((acc, s) => acc + s.totalEncontrados, 0),
    bienesReubicados: sesionesFiltradas.reduce((acc, s) => acc + s.totalReubicados, 0),
    bienesNoEncontrados: sesionesFiltradas.reduce((acc, s) => acc + s.totalNoEncontrados, 0),
    bienesSobrantes: sesionesFiltradas.reduce((acc, s) => acc + s.totalSobrantes, 0),
  }

  // Calcular porcentajes
  const totalBienes = estadisticas.totalVerificaciones
  const porcentajeEncontrados = totalBienes > 0 ? ((estadisticas.bienesEncontrados / totalBienes) * 100).toFixed(1) : "0"
  const porcentajeNoEncontrados = totalBienes > 0 ? ((estadisticas.bienesNoEncontrados / totalBienes) * 100).toFixed(1) : "0"

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
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
    return <Badge className={cfg.color}>{cfg.label}</Badge>
  }

  // Exportar a CSV
  const exportarCSV = (tipo: "sesiones" | "resumen") => {
    setExportando(true)

    let csv = ""
    let filename = ""

    if (tipo === "sesiones") {
      // Header
      csv = "Código,Nombre,Estado,Dependencia,Fecha Programada,Fecha Inicio,Fecha Fin,Total Verificados,Encontrados,Reubicados,No Encontrados,Sobrantes\n"

      // Datos
      sesionesFiltradas.forEach((s) => {
        csv += `"${s.codigo}","${s.nombre}","${s.estado}","${s.dependencia?.nombre || ''}","${formatDate(s.fechaProgramada)}","${formatDate(s.fechaInicio)}","${formatDate(s.fechaFin)}",${s.totalVerificados},${s.totalEncontrados},${s.totalReubicados},${s.totalNoEncontrados},${s.totalSobrantes}\n`
      })

      filename = `reporte_sesiones_${new Date().toISOString().split("T")[0]}.csv`
    } else {
      // Resumen
      csv = "Métrica,Valor\n"
      csv += `"Total Sesiones",${estadisticas.totalSesiones}\n`
      csv += `"Sesiones Finalizadas",${estadisticas.sesionesFinalizadas}\n`
      csv += `"Sesiones En Proceso",${estadisticas.sesionesEnProceso}\n`
      csv += `"Total Verificaciones",${estadisticas.totalVerificaciones}\n`
      csv += `"Bienes Encontrados",${estadisticas.bienesEncontrados}\n`
      csv += `"Bienes Reubicados",${estadisticas.bienesReubicados}\n`
      csv += `"Bienes No Encontrados",${estadisticas.bienesNoEncontrados}\n`
      csv += `"Bienes Sobrantes",${estadisticas.bienesSobrantes}\n`

      filename = `resumen_inventario_${new Date().toISOString().split("T")[0]}.csv`
    }

    // Descargar
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()

    setExportando(false)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Reportes de Patrimonio</h1>
          <p className="text-sm text-muted-foreground">
            Estadísticas y reportes del inventario físico
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PROGRAMADA">Programada</SelectItem>
                  <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                  <SelectItem value="PAUSADA">Pausada</SelectItem>
                  <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Dependencia</Label>
              <Select value={filtroDependencia} onValueChange={setFiltroDependencia}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las dependencias</SelectItem>
                  {dependencias.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {dep.siglas || dep.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2 lg:col-span-2">
              <Label>Exportar</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => exportarCSV("resumen")}
                  disabled={exportando}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Resumen CSV
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => exportarCSV("sesiones")}
                  disabled={exportando}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Sesiones CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Estadísticas Generales */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Sesiones</p>
                    <p className="text-xl font-bold">{estadisticas.totalSesiones}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Finalizadas</p>
                    <p className="text-xl font-bold">{estadisticas.sesionesFinalizadas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Verificados</p>
                    <p className="text-xl font-bold">{estadisticas.totalVerificaciones}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">% Encontrados</p>
                    <p className="text-xl font-bold">{porcentajeEncontrados}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle de Verificaciones */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Resumen de Verificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Encontrados</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{estadisticas.bienesEncontrados}</p>
                      <p className="text-xs text-green-600">{porcentajeEncontrados}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Reubicados</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-700">{estadisticas.bienesReubicados}</p>
                      <p className="text-xs text-blue-600">
                        {totalBienes > 0 ? ((estadisticas.bienesReubicados / totalBienes) * 100).toFixed(1) : "0"}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">No Encontrados</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-700">{estadisticas.bienesNoEncontrados}</p>
                      <p className="text-xs text-red-600">{porcentajeNoEncontrados}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Sobrantes</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-700">{estadisticas.bienesSobrantes}</p>
                      <p className="text-xs text-yellow-600">
                        {totalBienes > 0 ? ((estadisticas.bienesSobrantes / totalBienes) * 100).toFixed(1) : "0"}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Estado de Sesiones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {[
                    { estado: "PROGRAMADA", label: "Programadas", color: "bg-blue-500" },
                    { estado: "EN_PROCESO", label: "En Proceso", color: "bg-green-500" },
                    { estado: "PAUSADA", label: "Pausadas", color: "bg-yellow-500" },
                    { estado: "FINALIZADA", label: "Finalizadas", color: "bg-gray-500" },
                    { estado: "CANCELADA", label: "Canceladas", color: "bg-red-500" },
                  ].map(({ estado, label, color }) => {
                    const count = sesionesFiltradas.filter((s) => s.estado === estado).length
                    const percent = estadisticas.totalSesiones > 0 ? (count / estadisticas.totalSesiones) * 100 : 0
                    return (
                      <div key={estado} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{label}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} rounded-full transition-all`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Sesiones */}
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Detalle de Sesiones ({sesionesFiltradas.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden md:table-cell">Dependencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                      <TableHead className="text-center">Verificados</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">OK</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Faltantes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sesionesFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No hay sesiones con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      sesionesFiltradas.slice(0, 20).map((sesion) => (
                        <TableRow key={sesion.id}>
                          <TableCell className="font-mono text-xs">{sesion.codigo}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{sesion.nombre}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {sesion.dependencia?.siglas || sesion.dependencia?.nombre || "—"}
                          </TableCell>
                          <TableCell>{getEstadoBadge(sesion.estado)}</TableCell>
                          <TableCell className="hidden lg:table-cell whitespace-nowrap">
                            {formatDate(sesion.fechaProgramada)}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {sesion.totalVerificados}
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <span className="text-green-600 font-medium">{sesion.totalEncontrados}</span>
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <span className="text-red-600 font-medium">{sesion.totalNoEncontrados}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {sesionesFiltradas.length > 20 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  Mostrando 20 de {sesionesFiltradas.length} sesiones. Exporta a CSV para ver todas.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
