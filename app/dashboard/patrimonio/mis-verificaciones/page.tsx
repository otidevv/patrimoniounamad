"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowUpDown,
  ClipboardList,
  Loader2,
  CheckCircle2,
  XCircle,
  Package,
  Clock,
  ShieldCheck,
  Send,
  Eye,
  AlertTriangle,
  Lock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Asignacion {
  id: string
  sesionId: string
  estado: string
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  fechaEnvio: string | null
  fechaRespuestaUsuario: string | null
  fechaCierre: string | null
  observacionesUsuario: string | null
  createdAt: string
  sesion: {
    id: string
    codigo: string
    nombre: string
    estado: string
    sigaNombreDependencia: string | null
  }
  _count: { verificaciones: number }
}

interface Verificacion {
  id: string
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  serieSiga: string | null
  colorSiga: string | null
  dimensionesSiga: string | null
  situacion: string | null
  resultado: string
  estadoFisico: string | null
  observaciones: string | null
  ubicacionReal: string | null
  fechaVerificacion: string
  verificador?: { id: string; nombre: string; apellidos: string }
}

type SortField = "codigoPatrimonial" | "descripcionSiga" | "resultado" | "estadoFisico" | "fechaVerificacion"
type SortDir = "asc" | "desc"

const OPCIONES_POR_PAGINA = [10, 20, 50, 100]

export default function MisVerificacionesPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("all")
  const [busqueda, setBusqueda] = useState("")
  const [paginaLista, setPaginaLista] = useState(1)
  const [porPaginaLista, setPorPaginaLista] = useState(10)

  // Vista detalle
  const [vistaDetalle, setVistaDetalle] = useState(false)
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<Asignacion | null>(null)
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [loadingVerif, setLoadingVerif] = useState(false)

  // Detalle: búsqueda, paginación, ordenamiento
  const [busquedaDetalle, setBusquedaDetalle] = useState("")
  const [filtroResultado, setFiltroResultado] = useState("all")
  const [paginaActual, setPaginaActual] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [sortField, setSortField] = useState<SortField>("codigoPatrimonial")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Dialog de respuesta
  const [dialogRespuesta, setDialogRespuesta] = useState(false)
  const [accionDialog, setAccionDialog] = useState<"aceptar" | "rechazar">("aceptar")
  const [asignacionDialog, setAsignacionDialog] = useState<Asignacion | null>(null)
  const [observacionesResp, setObservacionesResp] = useState("")
  const [enviando, setEnviando] = useState(false)

  const cargarAsignaciones = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/inventario/asignaciones?mis=true")
      const data = await res.json()
      if (res.ok) setAsignaciones(data.asignaciones)
    } catch {
      toast.error("Error al cargar asignaciones")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarAsignaciones()
  }, [cargarAsignaciones])

  const verBienes = async (asig: Asignacion) => {
    setAsignacionSeleccionada(asig)
    setVistaDetalle(true)
    setBusquedaDetalle("")
    setFiltroResultado("all")
    setPaginaActual(1)
    setSortField("codigoPatrimonial")
    setSortDir("asc")
    setLoadingVerif(true)
    try {
      const res = await fetch(`/api/inventario/asignaciones/${asig.id}`)
      const data = await res.json()
      if (res.ok) setVerificaciones(data.asignacion.verificaciones)
    } catch {
      toast.error("Error al cargar bienes")
    } finally {
      setLoadingVerif(false)
    }
  }

  const volverALista = () => {
    setVistaDetalle(false)
    setAsignacionSeleccionada(null)
    setVerificaciones([])
  }

  const abrirDialogRespuesta = (asig: Asignacion, accion: "aceptar" | "rechazar") => {
    setAsignacionDialog(asig)
    setAccionDialog(accion)
    setObservacionesResp("")
    setDialogRespuesta(true)
  }

  const enviarRespuesta = async () => {
    if (!asignacionDialog) return
    if (accionDialog === "rechazar" && !observacionesResp.trim()) {
      toast.error("Debe indicar el motivo del rechazo")
      return
    }
    setEnviando(true)
    try {
      const res = await fetch(`/api/inventario/asignaciones/${asignacionDialog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: accionDialog, observaciones: observacionesResp.trim() || null }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(accionDialog === "aceptar"
          ? "Asignación aceptada correctamente"
          : "Asignación rechazada — el verificador será notificado")
        setDialogRespuesta(false)
        cargarAsignaciones()
        if (vistaDetalle && asignacionSeleccionada?.id === asignacionDialog.id) {
          setAsignacionSeleccionada({ ...asignacionDialog, estado: accionDialog === "aceptar" ? "ACEPTADO" : "RECHAZADO" })
        }
      } else {
        toast.error(data.error || "Error al responder")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setEnviando(false)
    }
  }

  // --- Lógica de detalle: filtrar, ordenar, paginar ---
  const verificacionesProcesadas = useMemo(() => {
    let items = [...verificaciones]

    // Filtro por resultado
    if (filtroResultado !== "all") {
      items = items.filter((v) => v.resultado === filtroResultado)
    }

    // Búsqueda
    if (busquedaDetalle) {
      const q = busquedaDetalle.toLowerCase()
      items = items.filter((v) =>
        v.codigoPatrimonial.toLowerCase().includes(q) ||
        (v.descripcionSiga || "").toLowerCase().includes(q) ||
        (v.marcaSiga || "").toLowerCase().includes(q) ||
        (v.modeloSiga || "").toLowerCase().includes(q) ||
        (v.serieSiga || "").toLowerCase().includes(q)
      )
    }

    // Ordenar
    items.sort((a, b) => {
      let valA: string | number = ""
      let valB: string | number = ""

      switch (sortField) {
        case "codigoPatrimonial": valA = a.codigoPatrimonial; valB = b.codigoPatrimonial; break
        case "descripcionSiga": valA = a.descripcionSiga || ""; valB = b.descripcionSiga || ""; break
        case "resultado": valA = a.resultado; valB = b.resultado; break
        case "estadoFisico": valA = a.estadoFisico || ""; valB = b.estadoFisico || ""; break
        case "fechaVerificacion": valA = new Date(a.fechaVerificacion).getTime(); valB = new Date(b.fechaVerificacion).getTime(); break
      }

      if (typeof valA === "string") {
        const cmp = valA.localeCompare(valB as string, "es")
        return sortDir === "asc" ? cmp : -cmp
      }
      return sortDir === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
    })

    return items
  }, [verificaciones, filtroResultado, busquedaDetalle, sortField, sortDir])

  const totalPaginas = Math.max(1, Math.ceil(verificacionesProcesadas.length / porPagina))
  const verificacionesPaginadas = verificacionesProcesadas.slice(
    (paginaActual - 1) * porPagina,
    paginaActual * porPagina
  )

  // Reset página al cambiar filtros
  useEffect(() => { setPaginaActual(1) }, [busquedaDetalle, filtroResultado, sortField, sortDir, porPagina])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="size-3 opacity-40" />
    return sortDir === "asc"
      ? <ArrowUp className="size-3 text-[#1e3a5f]" />
      : <ArrowDown className="size-3 text-[#1e3a5f]" />
  }

  // --- Badges ---
  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDIENTE: { color: "bg-gray-100 text-gray-800", icon: <Clock className="h-3 w-3" />, label: "Pendiente" },
      ENVIADO: { color: "bg-blue-100 text-blue-800", icon: <Send className="h-3 w-3" />, label: "Por revisar" },
      ACEPTADO: { color: "bg-green-100 text-green-800", icon: <ShieldCheck className="h-3 w-3" />, label: "Aceptado" },
      RECHAZADO: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" />, label: "Rechazado" },
      CERRADO: { color: "bg-gray-100 text-gray-800", icon: <Lock className="h-3 w-3" />, label: "Cerrado" },
    }
    const cfg = config[estado] || config.PENDIENTE
    return <Badge className={`${cfg.color} gap-1`}>{cfg.icon}{cfg.label}</Badge>
  }

  const getResultadoBadge = (resultado: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      ENCONTRADO: { color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" />, label: "Encontrado" },
      REUBICADO: { color: "bg-blue-100 text-blue-800", icon: <Eye className="h-3 w-3" />, label: "Reubicado" },
      NO_ENCONTRADO: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" />, label: "No encontrado" },
      SOBRANTE: { color: "bg-yellow-100 text-yellow-800", icon: <AlertTriangle className="h-3 w-3" />, label: "Sobrante" },
    }
    const cfg = config[resultado] || config.ENCONTRADO
    return <Badge className={`${cfg.color} gap-1 text-[10px]`}>{cfg.icon}{cfg.label}</Badge>
  }

  const getEstadoFisicoBadge = (estado: string | null) => {
    if (!estado) return <span className="text-xs text-muted-foreground">—</span>
    const colors: Record<string, string> = {
      BUENO: "bg-green-100 text-green-800",
      REGULAR: "bg-yellow-100 text-yellow-800",
      MALO: "bg-red-100 text-red-800",
      INOPERATIVO: "bg-red-100 text-red-800",
      CHATARRA: "bg-gray-200 text-gray-800",
    }
    return <Badge className={`${colors[estado] || "bg-gray-100 text-gray-800"} text-[10px]`}>{estado}</Badge>
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })

  // Filtros lista principal
  const asignacionesFiltradas = asignaciones.filter((a) => {
    if (filtroEstado !== "all" && a.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        a.sesion.codigo.toLowerCase().includes(q) ||
        a.sesion.nombre.toLowerCase().includes(q) ||
        (a.sesion.sigaNombreDependencia || "").toLowerCase().includes(q)
      )
    }
    return true
  })

  // Reset página lista al cambiar filtros
  useEffect(() => { setPaginaLista(1) }, [busqueda, filtroEstado, porPaginaLista])

  const totalPaginasLista = Math.max(1, Math.ceil(asignacionesFiltradas.length / porPaginaLista))
  const asignacionesPaginadas = asignacionesFiltradas.slice(
    (paginaLista - 1) * porPaginaLista,
    paginaLista * porPaginaLista
  )

  const pendientes = asignaciones.filter((a) => a.estado === "ENVIADO").length

  // Contadores de detalle
  const contadores = useMemo(() => {
    const c = { total: verificaciones.length, encontrado: 0, reubicado: 0, noEncontrado: 0, sobrante: 0 }
    for (const v of verificaciones) {
      if (v.resultado === "ENCONTRADO") c.encontrado++
      else if (v.resultado === "REUBICADO") c.reubicado++
      else if (v.resultado === "NO_ENCONTRADO") c.noEncontrado++
      else if (v.resultado === "SOBRANTE") c.sobrante++
    }
    return c
  }, [verificaciones])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Cargando...</span>
      </div>
    )
  }

  // =================== VISTA DETALLE ===================
  if (vistaDetalle && asignacionSeleccionada) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
        {/* Header detalle */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={volverALista} className="shrink-0">
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
                  {asignacionSeleccionada.sesion.codigo}
                </h1>
                {getEstadoBadge(asignacionSeleccionada.estado)}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {asignacionSeleccionada.sesion.nombre}
                {asignacionSeleccionada.sesion.sigaNombreDependencia && (
                  <> — {asignacionSeleccionada.sesion.sigaNombreDependencia}</>
                )}
              </p>
            </div>
          </div>

          {/* Acciones de aceptar/rechazar */}
          {asignacionSeleccionada.estado === "ENVIADO" && (
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => abrirDialogRespuesta(asignacionSeleccionada, "aceptar")}>
                <CheckCircle2 className="h-4 w-4" />
                Aceptar Asignación
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-red-600" onClick={() => abrirDialogRespuesta(asignacionSeleccionada, "rechazar")}>
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
            </div>
          )}
        </div>

        {/* Resumen estadísticas */}
        {!loadingVerif && verificaciones.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Card className="p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold">{contadores.total}</p>
            </Card>
            <Card className="p-3 border-green-200">
              <p className="text-[11px] text-green-700 uppercase tracking-wider">Encontrados</p>
              <p className="text-xl font-bold text-green-700">{contadores.encontrado}</p>
            </Card>
            <Card className="p-3 border-blue-200">
              <p className="text-[11px] text-blue-700 uppercase tracking-wider">Reubicados</p>
              <p className="text-xl font-bold text-blue-700">{contadores.reubicado}</p>
            </Card>
            <Card className="p-3 border-red-200">
              <p className="text-[11px] text-red-700 uppercase tracking-wider">No encontrados</p>
              <p className="text-xl font-bold text-red-700">{contadores.noEncontrado}</p>
            </Card>
            <Card className="p-3 border-yellow-200">
              <p className="text-[11px] text-yellow-700 uppercase tracking-wider">Sobrantes</p>
              <p className="text-xl font-bold text-yellow-700">{contadores.sobrante}</p>
            </Card>
          </div>
        )}

        {/* Filtros del detalle */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descripción, marca, modelo o serie..."
              value={busquedaDetalle}
              onChange={(e) => setBusquedaDetalle(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroResultado} onValueChange={setFiltroResultado}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los resultados</SelectItem>
              <SelectItem value="ENCONTRADO">Encontrado</SelectItem>
              <SelectItem value="REUBICADO">Reubicado</SelectItem>
              <SelectItem value="NO_ENCONTRADO">No encontrado</SelectItem>
              <SelectItem value="SOBRANTE">Sobrante</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de bienes */}
        {loadingVerif ? (
          <div className="flex justify-center py-12" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Cargando bienes...</span>
          </div>
        ) : verificaciones.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 sm:p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Sin bienes</h3>
              <p className="mt-2 text-sm text-muted-foreground">No se encontraron bienes en esta asignación</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs w-[40px] text-center">#</TableHead>
                      <TableHead className="text-xs">
                        <button onClick={() => toggleSort("codigoPatrimonial")} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                          Código Patrimonial <SortIcon field="codigoPatrimonial" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs">
                        <button onClick={() => toggleSort("descripcionSiga")} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                          Descripción <SortIcon field="descripcionSiga" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-xs">Marca</TableHead>
                      <TableHead className="hidden md:table-cell text-xs">Modelo</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs">Serie</TableHead>
                      <TableHead className="hidden lg:table-cell text-xs">Color</TableHead>
                      <TableHead className="text-xs">
                        <button onClick={() => toggleSort("resultado")} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                          Resultado <SortIcon field="resultado" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell text-xs">
                        <button onClick={() => toggleSort("estadoFisico")} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                          Estado Físico <SortIcon field="estadoFisico" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell text-xs">Situación</TableHead>
                      <TableHead className="hidden xl:table-cell text-xs">Observaciones</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs">
                        <button onClick={() => toggleSort("fechaVerificacion")} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                          Fecha <SortIcon field="fechaVerificacion" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verificacionesPaginadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-sm text-muted-foreground">
                          No se encontraron bienes con los filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      verificacionesPaginadas.map((v, i) => (
                        <TableRow key={v.id} className="hover:bg-slate-50/50">
                          <TableCell className="text-xs text-muted-foreground text-center py-2">
                            {(paginaActual - 1) * porPagina + i + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs py-2 whitespace-nowrap">
                            {v.codigoPatrimonial}
                          </TableCell>
                          <TableCell className="text-sm py-2 max-w-[250px]">
                            <span className="line-clamp-2">{v.descripcionSiga || "Sin información"}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs py-2 whitespace-nowrap">
                            {v.marcaSiga || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs py-2 whitespace-nowrap">
                            {v.modeloSiga || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs py-2 font-mono whitespace-nowrap">
                            {v.serieSiga || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs py-2">
                            {v.colorSiga || "—"}
                          </TableCell>
                          <TableCell className="py-2">
                            {getResultadoBadge(v.resultado)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell py-2">
                            {getEstadoFisicoBadge(v.estadoFisico)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs py-2">
                            {v.situacion === "U" ? "En uso" : v.situacion === "D" ? "En desuso" : "—"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-xs py-2 max-w-[180px]">
                            <span className="line-clamp-2 text-muted-foreground">{v.observaciones || "—"}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground py-2 whitespace-nowrap">
                            {formatDateTime(v.fechaVerificacion)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Mostrar</span>
                  <Select value={String(porPagina)} onValueChange={(v) => setPorPagina(Number(v))}>
                    <SelectTrigger className="h-8 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_POR_PAGINA.map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    de {verificacionesProcesadas.length} bienes
                  </span>
                </div>
                {totalPaginas > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={paginaActual <= 1}
                      onClick={() => setPaginaActual((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm px-2 min-w-[60px] text-center">
                      {paginaActual} / {totalPaginas}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={paginaActual >= totalPaginas}
                      onClick={() => setPaginaActual((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog: Aceptar/Rechazar (en vista detalle) */}
        <Dialog open={dialogRespuesta} onOpenChange={setDialogRespuesta}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {accionDialog === "aceptar" ? "Aceptar Asignación" : "Rechazar Asignación"}
              </DialogTitle>
              <DialogDescription>
                {accionDialog === "aceptar"
                  ? "Al aceptar, confirmas que los bienes listados están bajo tu responsabilidad."
                  : "Indica el motivo del rechazo para que el verificador pueda corregir."}
              </DialogDescription>
            </DialogHeader>

            {asignacionDialog && (
              <div className="p-3 rounded-md bg-muted text-sm space-y-1">
                <p><strong>Sesión:</strong> {asignacionDialog.sesion.codigo} — {asignacionDialog.sesion.nombre}</p>
                <p><strong>Bienes:</strong> {asignacionDialog._count.verificaciones}</p>
                {asignacionDialog.sesion.sigaNombreDependencia && (
                  <p><strong>Dependencia:</strong> {asignacionDialog.sesion.sigaNombreDependencia}</p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label>{accionDialog === "aceptar" ? "Observaciones (opcional)" : "Motivo del rechazo *"}</Label>
              <Textarea
                placeholder={accionDialog === "aceptar"
                  ? "Observaciones opcionales..."
                  : "Indique por qué rechaza la asignación..."}
                value={observacionesResp}
                onChange={(e) => setObservacionesResp(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogRespuesta(false)}>
                Cancelar
              </Button>
              <Button
                onClick={enviarRespuesta}
                disabled={enviando || (accionDialog === "rechazar" && !observacionesResp.trim())}
                variant={accionDialog === "aceptar" ? "default" : "destructive"}
              >
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accionDialog === "aceptar" ? "Confirmar Aceptación" : "Confirmar Rechazo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // =================== VISTA LISTA ===================
  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mis Verificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Asignaciones de inventario que te han enviado para revisión
          </p>
        </div>
        {pendientes > 0 && (
          <Badge className="bg-blue-600 text-white gap-1 self-start sm:self-auto">
            <Send className="h-3 w-3" />
            {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o dependencia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="ENVIADO">Por revisar</SelectItem>
            <SelectItem value="ACEPTADO">Aceptados</SelectItem>
            <SelectItem value="RECHAZADO">Rechazados</SelectItem>
            <SelectItem value="CERRADO">Cerrados</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={cargarAsignaciones}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabla */}
      {asignacionesFiltradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 sm:p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Sin asignaciones</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {busqueda || filtroEstado !== "all"
                ? "No se encontraron asignaciones con los filtros aplicados"
                : "No tienes asignaciones de inventario en este momento"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Sesión</TableHead>
                    <TableHead className="hidden md:table-cell text-xs">Dependencia</TableHead>
                    <TableHead className="text-xs text-center">Bienes</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs">Fecha</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asignacionesPaginadas.map((asig) => (
                    <TableRow key={asig.id}>
                      <TableCell className="font-mono text-xs sm:text-sm py-2 whitespace-nowrap">
                        {asig.sesion.codigo}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]">
                          {asig.sesion.nombre}
                        </div>
                        <div className="md:hidden text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {asig.sesion.sigaNombreDependencia || ""}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs py-2 max-w-[200px] truncate">
                        {asig.sesion.sigaNombreDependencia || "—"}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="font-bold text-sm">{asig._count.verificaciones}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        {getEstadoBadge(asig.estado)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground py-2 whitespace-nowrap">
                        {asig.fechaEnvio ? formatDate(asig.fechaEnvio) : "—"}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => verBienes(asig)}>
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Ver bienes</span>
                          </Button>
                          {asig.estado === "ENVIADO" && (
                            <>
                              <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => abrirDialogRespuesta(asig, "aceptar")}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Aceptar</span>
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-red-600" onClick={() => abrirDialogRespuesta(asig, "rechazar")}>
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Rechazar</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Mostrar</span>
                <Select value={String(porPaginaLista)} onValueChange={(v) => setPorPaginaLista(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_POR_PAGINA.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  de {asignacionesFiltradas.length} asignaciones
                </span>
              </div>
              {totalPaginasLista > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaLista <= 1} onClick={() => setPaginaLista((p) => p - 1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm px-2 min-w-[60px] text-center">{paginaLista} / {totalPaginasLista}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={paginaLista >= totalPaginasLista} onClick={() => setPaginaLista((p) => p + 1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Aceptar/Rechazar */}
      <Dialog open={dialogRespuesta} onOpenChange={setDialogRespuesta}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {accionDialog === "aceptar" ? "Aceptar Asignación" : "Rechazar Asignación"}
            </DialogTitle>
            <DialogDescription>
              {accionDialog === "aceptar"
                ? "Al aceptar, confirmas que los bienes listados están bajo tu responsabilidad."
                : "Indica el motivo del rechazo para que el verificador pueda corregir."}
            </DialogDescription>
          </DialogHeader>

          {asignacionDialog && (
            <div className="p-3 rounded-md bg-muted text-sm space-y-1">
              <p><strong>Sesión:</strong> {asignacionDialog.sesion.codigo} — {asignacionDialog.sesion.nombre}</p>
              <p><strong>Bienes:</strong> {asignacionDialog._count.verificaciones}</p>
              {asignacionDialog.sesion.sigaNombreDependencia && (
                <p><strong>Dependencia:</strong> {asignacionDialog.sesion.sigaNombreDependencia}</p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label>{accionDialog === "aceptar" ? "Observaciones (opcional)" : "Motivo del rechazo *"}</Label>
            <Textarea
              placeholder={accionDialog === "aceptar"
                ? "Observaciones opcionales..."
                : "Indique por qué rechaza la asignación..."}
              value={observacionesResp}
              onChange={(e) => setObservacionesResp(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRespuesta(false)}>
              Cancelar
            </Button>
            <Button
              onClick={enviarRespuesta}
              disabled={enviando || (accionDialog === "rechazar" && !observacionesResp.trim())}
              variant={accionDialog === "aceptar" ? "default" : "destructive"}
            >
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accionDialog === "aceptar" ? "Confirmar Aceptación" : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
