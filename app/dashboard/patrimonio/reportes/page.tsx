"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Cpu,
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
  TrendingUp,
  PieChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

interface EquipoComputo {
  id: string
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  serieSiga: string | null
  procesador: string | null
  generacion: string | null
  sistemaOperativo: string | null
  ram: string | null
  disco: string | null
  resultado: string
  ubicacionReal: string | null
  ubicacionSiga: string | null
  responsableReal: string | null
  sesion: { id: string; codigo: string; nombre: string }
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

const OPCIONES_PAGINA = [10, 20, 50, 100]

export default function ReportesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>("all")
  const [filtroDependencia, setFiltroDependencia] = useState<string>("all")
  const [exportando, setExportando] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Equipos de cómputo de todas las sesiones
  const [equipos, setEquipos] = useState<EquipoComputo[]>([])
  const [loadingEquipos, setLoadingEquipos] = useState(true)
  const [pageEquipos, setPageEquipos] = useState(1)
  const [pageSizeEquipos, setPageSizeEquipos] = useState(20)
  const [totalEquipos, setTotalEquipos] = useState(0)
  const [totalPagesEquipos, setTotalPagesEquipos] = useState(1)

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

  const cargarEquipos = useCallback(async () => {
    setLoadingEquipos(true)
    try {
      const query = new URLSearchParams({
        page: String(pageEquipos),
        limit: String(pageSizeEquipos),
      })
      if (filtroEstado !== "all") query.set("estado", filtroEstado)
      if (filtroDependencia !== "all") query.set("dependenciaId", filtroDependencia)

      const response = await fetch(`/api/inventario/reporte-consolidado?${query}`)
      const data = await response.json()

      if (response.ok) {
        setEquipos(data.equipos || [])
        setTotalEquipos(data.pagination?.total || 0)
        setTotalPagesEquipos(Math.max(1, data.pagination?.pages || 1))
      }
    } catch (error) {
      console.error("Error al cargar equipos de cómputo:", error)
    } finally {
      setLoadingEquipos(false)
    }
  }, [pageEquipos, pageSizeEquipos, filtroEstado, filtroDependencia])

  useEffect(() => {
    cargarEquipos()
  }, [cargarEquipos])

  // Filtrar sesiones
  const sesionesFiltradas = sesiones.filter((s) => {
    if (filtroEstado !== "all" && s.estado !== filtroEstado) return false
    if (filtroDependencia !== "all" && s.dependencia?.id !== filtroDependencia) return false
    return true
  })

  // Paginación de la tabla de sesiones
  const totalPages = Math.max(1, Math.ceil(sesionesFiltradas.length / pageSize))
  const paginaActual = Math.min(page, totalPages)
  const sesionesPagina = sesionesFiltradas.slice(
    (paginaActual - 1) * pageSize,
    paginaActual * pageSize
  )
  const desde = sesionesFiltradas.length === 0 ? 0 : (paginaActual - 1) * pageSize + 1
  const hasta = Math.min(paginaActual * pageSize, sesionesFiltradas.length)

  // Paginación de la tabla de equipos de cómputo (datos del servidor)
  const desdeEquipos = totalEquipos === 0 ? 0 : (pageEquipos - 1) * pageSizeEquipos + 1
  const hastaEquipos = Math.min(pageEquipos * pageSizeEquipos, totalEquipos)

  // Al cambiar filtros o tamaño de página, volver a la primera página
  const cambiarFiltroEstado = (valor: string) => {
    setFiltroEstado(valor)
    setPage(1)
    setPageEquipos(1)
  }

  const cambiarFiltroDependencia = (valor: string) => {
    setFiltroDependencia(valor)
    setPage(1)
    setPageEquipos(1)
  }

  const cambiarPageSizeEquipos = (valor: string) => {
    setPageSizeEquipos(Number(valor))
    setPageEquipos(1)
  }

  const cambiarPageSize = (valor: string) => {
    setPageSize(Number(valor))
    setPage(1)
  }

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

  const getResultadoBadge = (resultado: string) => {
    const config: Record<string, { color: string; label: string }> = {
      ENCONTRADO: { color: "bg-green-100 text-green-800", label: "Encontrado" },
      REUBICADO: { color: "bg-blue-100 text-blue-800", label: "Reubicado" },
      NO_ENCONTRADO: { color: "bg-red-100 text-red-800", label: "No Encontrado" },
      SOBRANTE: { color: "bg-yellow-100 text-yellow-800", label: "Sobrante" },
    }
    const cfg = config[resultado]
    if (!cfg) return <Badge variant="outline">{resultado}</Badge>
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

  // Descargar reporte consolidado de todas las sesiones (generado en el servidor)
  const descargarConsolidado = async () => {
    setExportando(true)
    try {
      const query = new URLSearchParams({ formato: "excel" })
      if (filtroEstado !== "all") query.set("estado", filtroEstado)
      if (filtroDependencia !== "all") query.set("dependenciaId", filtroDependencia)

      const response = await fetch(`/api/inventario/reporte-consolidado?${query}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al generar el reporte consolidado")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        `Reporte_Consolidado_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error al descargar el reporte consolidado:", error)
    } finally {
      setExportando(false)
    }
  }

  // Exportar a Excel (.xlsx)
  const exportarExcel = (tipo: "sesiones" | "resumen") => {
    setExportando(true)

    try {
      const wb = XLSX.utils.book_new()
      const fecha = new Date().toISOString().split("T")[0]

      if (tipo === "sesiones") {
        const columnas = [
          "C\u00f3digo", "Nombre", "Estado", "Dependencia", "Sede", "Responsable",
          "Fecha Programada", "Fecha Inicio", "Fecha Fin", "Total Bienes SIGA",
          "Total Verificados", "Encontrados", "Reubicados", "No Encontrados",
          "Sobrantes", "% Avance",
        ]

        const datos = sesionesFiltradas.map((s) => ({
          "C\u00f3digo": s.codigo,
          "Nombre": s.nombre,
          "Estado": s.estado,
          "Dependencia": s.dependencia?.nombre || "",
          "Sede": s.sede?.nombre || "",
          "Responsable": `${s.responsable.apellidos} ${s.responsable.nombre}`,
          "Fecha Programada": formatDate(s.fechaProgramada),
          "Fecha Inicio": formatDate(s.fechaInicio),
          "Fecha Fin": formatDate(s.fechaFin),
          "Total Bienes SIGA": s.totalBienesSiga,
          "Total Verificados": s.totalVerificados,
          "Encontrados": s.totalEncontrados,
          "Reubicados": s.totalReubicados,
          "No Encontrados": s.totalNoEncontrados,
          "Sobrantes": s.totalSobrantes,
          "% Avance":
            s.totalBienesSiga > 0
              ? Math.round((s.totalVerificados / s.totalBienesSiga) * 100)
              : 0,
        }))

        const ws = XLSX.utils.json_to_sheet(datos, { header: columnas })
        ws["!cols"] = columnas.map((col) => ({
          wch:
            Math.max(
              col.length,
              ...datos.map((row) => String(row[col as keyof typeof row] ?? "").length)
            ) + 2,
        }))
        XLSX.utils.book_append_sheet(wb, ws, "Sesiones")
      } else {
        const datos = [
          { "M\u00e9trica": "Total Sesiones", "Valor": estadisticas.totalSesiones },
          { "M\u00e9trica": "Sesiones Finalizadas", "Valor": estadisticas.sesionesFinalizadas },
          { "M\u00e9trica": "Sesiones En Proceso", "Valor": estadisticas.sesionesEnProceso },
          { "M\u00e9trica": "Total Verificaciones", "Valor": estadisticas.totalVerificaciones },
          { "M\u00e9trica": "Bienes Encontrados", "Valor": estadisticas.bienesEncontrados },
          { "M\u00e9trica": "Bienes Reubicados", "Valor": estadisticas.bienesReubicados },
          { "M\u00e9trica": "Bienes No Encontrados", "Valor": estadisticas.bienesNoEncontrados },
          { "M\u00e9trica": "Bienes Sobrantes", "Valor": estadisticas.bienesSobrantes },
        ]
        const ws = XLSX.utils.json_to_sheet(datos, { header: ["M\u00e9trica", "Valor"] })
        ws["!cols"] = [{ wch: 28 }, { wch: 12 }]
        XLSX.utils.book_append_sheet(wb, ws, "Resumen")
      }

      // Hoja de informaci\u00f3n
      const infoData = [
        ["UNIVERSIDAD NACIONAL AMAZ\u00d3NICA DE MADRE DE DIOS"],
        ["SISTEMA DE GESTI\u00d3N DE PATRIMONIO"],
        [""],
        ["REPORTE:", tipo === "sesiones" ? "Sesiones de Inventario" : "Resumen de Inventario"],
        ["FECHA DE GENERACI\u00d3N:", new Date().toLocaleString("es-PE")],
        ["TOTAL DE REGISTROS:", sesionesFiltradas.length],
        [
          "FILTRO ESTADO:",
          filtroEstado === "all" ? "Todos" : filtroEstado,
        ],
        [
          "FILTRO DEPENDENCIA:",
          filtroDependencia === "all"
            ? "Todas"
            : dependencias.find((d) => d.id === filtroDependencia)?.nombre || filtroDependencia,
        ],
      ]
      const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
      wsInfo["!cols"] = [{ wch: 28 }, { wch: 50 }]
      XLSX.utils.book_append_sheet(wb, wsInfo, "Informaci\u00f3n")

      const nombreArchivo =
        tipo === "sesiones"
          ? `reporte_sesiones_${fecha}.xlsx`
          : `resumen_inventario_${fecha}.xlsx`
      XLSX.writeFile(wb, nombreArchivo)
    } catch (error) {
      console.error("Error al exportar a Excel:", error)
    } finally {
      setExportando(false)
    }
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
              <Select value={filtroEstado} onValueChange={cambiarFiltroEstado}>
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
              <Select value={filtroDependencia} onValueChange={cambiarFiltroDependencia}>
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
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="w-full col-span-2"
                  onClick={descargarConsolidado}
                  disabled={exportando}
                >
                  {exportando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Cpu className="h-4 w-4 mr-2" />
                  )}
                  Reporte Consolidado (todas las sesiones)
                </Button>
                <Button
                  className="w-full"
                  onClick={() => exportarExcel("resumen")}
                  disabled={exportando}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Resumen Excel
                </Button>
                <Button
                  className="w-full"
                  onClick={() => exportarExcel("sesiones")}
                  disabled={exportando}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Sesiones Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => exportarCSV("resumen")}
                  disabled={exportando}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Resumen CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    Detalle de Sesiones ({sesionesFiltradas.length})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Haz clic en una sesión para ver su reporte y descargar el Excel
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Por página</Label>
                  <Select value={String(pageSize)} onValueChange={cambiarPageSize}>
                    <SelectTrigger className="w-full sm:w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_PAGINA.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} filas
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sesionesFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No hay sesiones con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      sesionesPagina.map((sesion) => (
                        <TableRow
                          key={sesion.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            router.push(`/dashboard/patrimonio/reportes/${sesion.id}`)
                          }
                        >
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
                          <TableCell className="text-muted-foreground">
                            <ChevronRight className="h-4 w-4" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {sesionesFiltradas.length === 0
                    ? "Sin sesiones"
                    : `Mostrando ${desde}–${hasta} de ${sesionesFiltradas.length} sesiones`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={paginaActual === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(paginaActual - 1)}
                    disabled={paginaActual === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 whitespace-nowrap">
                    Página {paginaActual} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(paginaActual + 1)}
                    disabled={paginaActual >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={paginaActual >= totalPages}
                  >
                    Última
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipos de Cómputo de todas las sesiones */}
          <Card>
            <CardHeader className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Equipos de Cómputo — Todas las Sesiones ({totalEquipos})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bienes con especificaciones técnicas registradas en todas las
                    sesiones de inventario
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Por página</Label>
                  <Select
                    value={String(pageSizeEquipos)}
                    onValueChange={cambiarPageSizeEquipos}
                  >
                    <SelectTrigger className="w-full sm:w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_PAGINA.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} filas
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Denominación</TableHead>
                      <TableHead className="hidden md:table-cell">Marca / Modelo</TableHead>
                      <TableHead>Procesador</TableHead>
                      <TableHead className="hidden sm:table-cell">RAM</TableHead>
                      <TableHead className="hidden sm:table-cell">Disco</TableHead>
                      <TableHead className="hidden lg:table-cell">S.O.</TableHead>
                      <TableHead className="hidden md:table-cell">Sesión</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingEquipos ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : equipos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No hay equipos de cómputo con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      equipos.map((equipo) => (
                        <TableRow
                          key={equipo.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            router.push(`/dashboard/patrimonio/reportes/${equipo.sesion.id}`)
                          }
                        >
                          <TableCell className="font-mono text-xs">
                            {equipo.codigoPatrimonial}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {equipo.descripcionSiga || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[140px] truncate">
                            {[equipo.marcaSiga, equipo.modeloSiga]
                              .filter(Boolean)
                              .join(" / ") || "—"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {[equipo.procesador, equipo.generacion]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell whitespace-nowrap">
                            {equipo.ram || "—"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell whitespace-nowrap">
                            {equipo.disco || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-[120px] truncate">
                            {equipo.sistemaOperativo || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs">
                            {equipo.sesion.codigo}
                          </TableCell>
                          <TableCell>{getResultadoBadge(equipo.resultado)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación de equipos */}
              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {totalEquipos === 0
                    ? "Sin equipos de cómputo"
                    : `Mostrando ${desdeEquipos}–${hastaEquipos} de ${totalEquipos} equipos`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageEquipos(1)}
                    disabled={pageEquipos === 1}
                  >
                    Primera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageEquipos(pageEquipos - 1)}
                    disabled={pageEquipos === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 whitespace-nowrap">
                    Página {pageEquipos} de {totalPagesEquipos}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageEquipos(pageEquipos + 1)}
                    disabled={pageEquipos >= totalPagesEquipos}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageEquipos(totalPagesEquipos)}
                    disabled={pageEquipos >= totalPagesEquipos}
                  >
                    Última
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
