"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
  descripcion: string | null
  estado: string
  ubicacionFisica: string | null
  sigaNombreDependencia: string | null
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

interface Verificacion {
  id: string
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  serieSiga: string | null
  colorSiga: string | null
  tipoSiga: string | null
  dimensionesSiga: string | null
  procesador: string | null
  generacion: string | null
  sistemaOperativo: string | null
  ram: string | null
  disco: string | null
  resultado: string
  estadoFisico: string | null
  situacion: string | null
  ubicacionSiga: string | null
  ubicacionReal: string | null
  responsableReal: string | null
  dniResponsableActual: string | null
  observaciones: string | null
  fechaVerificacion: string
  verificador: { id: string; nombre: string; apellidos: string } | null
}

const OPCIONES_PAGINA = [20, 50, 100]

const LABEL_RESULTADO: Record<string, { label: string; color: string }> = {
  ENCONTRADO: { label: "Encontrado", color: "bg-green-100 text-green-800" },
  REUBICADO: { label: "Reubicado", color: "bg-blue-100 text-blue-800" },
  NO_ENCONTRADO: { label: "No Encontrado", color: "bg-red-100 text-red-800" },
  SOBRANTE: { label: "Sobrante", color: "bg-yellow-100 text-yellow-800" },
}

const LABEL_ESTADO_SESION: Record<string, { label: string; color: string }> = {
  PROGRAMADA: { label: "Programada", color: "bg-blue-100 text-blue-800" },
  EN_PROCESO: { label: "En Proceso", color: "bg-green-100 text-green-800" },
  PAUSADA: { label: "Pausada", color: "bg-yellow-100 text-yellow-800" },
  FINALIZADA: { label: "Finalizada", color: "bg-gray-100 text-gray-800" },
  CANCELADA: { label: "Cancelada", color: "bg-red-100 text-red-800" },
}

// Un bien es equipo de cómputo si tiene alguna especificación técnica registrada
function esEquipoComputo(v: Verificacion): boolean {
  return Boolean(v.procesador || v.generacion || v.sistemaOperativo || v.ram || v.disco)
}

export default function ReporteSesionPage() {
  const params = useParams()
  const router = useRouter()
  const sesionId = params.id as string

  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [loadingSesion, setLoadingSesion] = useState(true)
  const [loadingTabla, setLoadingTabla] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroResultado, setFiltroResultado] = useState("all")
  const [mostrarComputo, setMostrarComputo] = useState(false)
  const [descargando, setDescargando] = useState(false)

  // Paginación
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const cargarSesion = useCallback(async () => {
    setLoadingSesion(true)
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "No se pudo cargar la sesión")
        return
      }

      setSesion(data)
    } catch {
      setError("Error al cargar la sesión")
    } finally {
      setLoadingSesion(false)
    }
  }, [sesionId])

  const cargarVerificaciones = useCallback(async () => {
    setLoadingTabla(true)
    try {
      const query = new URLSearchParams({
        sesionId,
        page: String(page),
        limit: String(pageSize),
      })
      if (filtroResultado !== "all") query.set("resultado", filtroResultado)

      const response = await fetch(`/api/inventario/verificaciones?${query}`)
      const data = await response.json()

      if (response.ok) {
        setVerificaciones(data.verificaciones || [])
        setTotal(data.pagination?.total || 0)
        setTotalPages(Math.max(1, data.pagination?.pages || 1))
      }
    } catch (err) {
      console.error("Error al cargar verificaciones:", err)
    } finally {
      setLoadingTabla(false)
    }
  }, [sesionId, page, pageSize, filtroResultado])

  useEffect(() => {
    cargarSesion()
  }, [cargarSesion])

  useEffect(() => {
    cargarVerificaciones()
  }, [cargarVerificaciones])

  // Al cambiar de filtro o tamaño de página, volver a la primera página
  const cambiarFiltro = (valor: string) => {
    setFiltroResultado(valor)
    setPage(1)
  }

  const cambiarPageSize = (valor: string) => {
    setPageSize(Number(valor))
    setPage(1)
  }

  const descargarExcel = async () => {
    setDescargando(true)
    try {
      toast.loading("Generando Excel...", { id: "reporte-excel" })
      const query = new URLSearchParams()
      if (filtroResultado !== "all") query.set("resultado", filtroResultado)

      const response = await fetch(
        `/api/inventario/sesiones/${sesionId}/reporte-excel?${query}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al generar el Excel")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        `Reporte_${sesion?.codigo || sesionId}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Excel descargado correctamente", { id: "reporte-excel" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al descargar el Excel", {
        id: "reporte-excel",
      })
    } finally {
      setDescargando(false)
    }
  }

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "—"
    return new Date(fecha).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatFechaHora = (fecha: string) => {
    return new Date(fecha).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1
  const hasta = Math.min(page * pageSize, total)
  const totalColumnas = mostrarComputo ? 13 : 8

  if (loadingSesion) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !sesion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "Sesión no encontrada"}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/patrimonio/reportes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a reportes
        </Button>
      </div>
    )
  }

  const estadoCfg = LABEL_ESTADO_SESION[sesion.estado] || LABEL_ESTADO_SESION.PROGRAMADA

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 text-muted-foreground"
            onClick={() => router.push("/dashboard/patrimonio/reportes")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Reportes
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{sesion.nombre}</h1>
            <Badge className={estadoCfg.color}>{estadoCfg.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{sesion.codigo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={cargarVerificaciones} disabled={loadingTabla}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingTabla ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button onClick={descargarExcel} disabled={descargando}>
            {descargando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Descargar Excel
          </Button>
        </div>
      </div>

      {/* Datos de la sesión */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Dependencia</p>
                <p className="font-medium">
                  {sesion.sigaNombreDependencia || sesion.dependencia?.nombre || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Sede / Ubicación</p>
                <p className="font-medium">
                  {sesion.sede?.nombre || "—"}
                  {sesion.ubicacionFisica ? ` · ${sesion.ubicacionFisica}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Responsable</p>
                <p className="font-medium">
                  {sesion.responsable.apellidos} {sesion.responsable.nombre}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Fechas</p>
                <p className="font-medium">
                  {formatFecha(sesion.fechaProgramada)}
                  {sesion.fechaFin ? ` → ${formatFecha(sesion.fechaFin)}` : ""}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verificados</p>
                <p className="text-xl font-bold">{sesion.totalVerificados}</p>
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
                <p className="text-xs text-muted-foreground">Encontrados</p>
                <p className="text-xl font-bold">{sesion.totalEncontrados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reubicados</p>
                <p className="text-xl font-bold">{sesion.totalReubicados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">No Encontrados</p>
                <p className="text-xl font-bold">{sesion.totalNoEncontrados}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sobrantes</p>
                <p className="text-xl font-bold">{sesion.totalSobrantes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de bienes verificados */}
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <CardTitle className="text-base">
              Bienes Verificados ({total})
            </CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid gap-1.5">
                <Label className="text-xs">Resultado</Label>
                <Select value={filtroResultado} onValueChange={cambiarFiltro}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los resultados</SelectItem>
                    <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
                    <SelectItem value="REUBICADO">Reubicado</SelectItem>
                    <SelectItem value="NO_ENCONTRADO">No Encontrado</SelectItem>
                    <SelectItem value="SOBRANTE">Sobrante</SelectItem>
                  </SelectContent>
                </Select>
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
              <Button
                variant={mostrarComputo ? "default" : "outline"}
                onClick={() => setMostrarComputo((v) => !v)}
              >
                <Cpu className="h-4 w-4 mr-2" />
                Especificaciones
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Denominación</TableHead>
                  <TableHead className="hidden md:table-cell">Marca / Modelo</TableHead>
                  <TableHead className="hidden lg:table-cell">Serie</TableHead>
                  {mostrarComputo && (
                    <>
                      <TableHead>Procesador</TableHead>
                      <TableHead>Gen.</TableHead>
                      <TableHead>RAM</TableHead>
                      <TableHead>Disco</TableHead>
                      <TableHead>S.O.</TableHead>
                    </>
                  )}
                  <TableHead>Resultado</TableHead>
                  <TableHead className="hidden sm:table-cell">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                  <TableHead className="hidden xl:table-cell">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTabla ? (
                  <TableRow>
                    <TableCell colSpan={totalColumnas} className="py-10 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : verificaciones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={totalColumnas}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No hay bienes verificados con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  verificaciones.map((v) => {
                    const cfg = LABEL_RESULTADO[v.resultado] || {
                      label: v.resultado,
                      color: "bg-gray-100 text-gray-800",
                    }
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {v.codigoPatrimonial}
                            {esEquipoComputo(v) && (
                              <Cpu className="h-3 w-3 text-blue-500 shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {v.descripcionSiga || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[160px] truncate">
                          {[v.marcaSiga, v.modeloSiga].filter(Boolean).join(" / ") || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-xs">
                          {v.serieSiga || "—"}
                        </TableCell>
                        {mostrarComputo && (
                          <>
                            <TableCell className="text-xs max-w-[140px] truncate">
                              {v.procesador || "—"}
                            </TableCell>
                            <TableCell className="text-xs">{v.generacion || "—"}</TableCell>
                            <TableCell className="text-xs">{v.ram || "—"}</TableCell>
                            <TableCell className="text-xs">{v.disco || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">
                              {v.sistemaOperativo || "—"}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <Badge className={cfg.color}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">
                          {v.estadoFisico || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[180px] truncate text-xs">
                          {v.responsableReal || "—"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs whitespace-nowrap">
                          {formatFechaHora(v.fechaVerificacion)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "Sin registros"
                : `Mostrando ${desde}–${hasta} de ${total} registros`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1 || loadingTabla}
              >
                Primera
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loadingTabla}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2 whitespace-nowrap">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loadingTabla}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loadingTabla}
              >
                Última
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Download className="h-3 w-3" />
        El Excel incluye todos los registros del filtro actual, con una hoja aparte para
        los equipos de cómputo y sus especificaciones técnicas.
      </p>
    </div>
  )
}
