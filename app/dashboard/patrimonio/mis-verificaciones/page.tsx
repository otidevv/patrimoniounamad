"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
  resultado: string
  estadoFisico: string | null
  observaciones: string | null
  fechaVerificacion: string
}

export default function MisVerificacionesPage() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("all")
  const [busqueda, setBusqueda] = useState("")

  // Dialog ver bienes
  const [dialogBienes, setDialogBienes] = useState(false)
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<Asignacion | null>(null)
  const [verificaciones, setVerificaciones] = useState<Verificacion[]>([])
  const [loadingVerif, setLoadingVerif] = useState(false)

  // Dialog de respuesta
  const [dialogRespuesta, setDialogRespuesta] = useState(false)
  const [accionDialog, setAccionDialog] = useState<"aceptar" | "rechazar">("aceptar")
  const [asignacionDialog, setAsignacionDialog] = useState<Asignacion | null>(null)
  const [observaciones, setObservaciones] = useState("")
  const [enviando, setEnviando] = useState(false)

  const cargarAsignaciones = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/inventario/asignaciones?mis=true")
      const data = await res.json()
      if (res.ok) {
        setAsignaciones(data.asignaciones)
      }
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
    setDialogBienes(true)
    setLoadingVerif(true)
    try {
      const res = await fetch(`/api/inventario/asignaciones/${asig.id}`)
      const data = await res.json()
      if (res.ok) {
        setVerificaciones(data.asignacion.verificaciones)
      }
    } catch {
      toast.error("Error al cargar bienes")
    } finally {
      setLoadingVerif(false)
    }
  }

  const abrirDialogRespuesta = (asig: Asignacion, accion: "aceptar" | "rechazar") => {
    setAsignacionDialog(asig)
    setAccionDialog(accion)
    setObservaciones("")
    setDialogRespuesta(true)
  }

  const enviarRespuesta = async () => {
    if (!asignacionDialog) return
    if (accionDialog === "rechazar" && !observaciones.trim()) {
      toast.error("Debe indicar el motivo del rechazo")
      return
    }

    setEnviando(true)
    try {
      const res = await fetch(`/api/inventario/asignaciones/${asignacionDialog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: accionDialog,
          observaciones: observaciones.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(accionDialog === "aceptar"
          ? "Asignación aceptada correctamente"
          : "Asignación rechazada — el verificador será notificado")
        setDialogRespuesta(false)
        cargarAsignaciones()
      } else {
        toast.error(data.error || "Error al responder")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setEnviando(false)
    }
  }

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
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      ENCONTRADO: { color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
      REUBICADO: { color: "bg-blue-100 text-blue-800", icon: <Eye className="h-3 w-3" /> },
      NO_ENCONTRADO: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" /> },
      SOBRANTE: { color: "bg-yellow-100 text-yellow-800", icon: <AlertTriangle className="h-3 w-3" /> },
    }
    const cfg = config[resultado] || config.ENCONTRADO
    return <Badge className={`${cfg.color} gap-1 text-[10px]`}>{cfg.icon}{resultado}</Badge>
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })

  // Filtros
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

  const pendientes = asignaciones.filter((a) => a.estado === "ENVIADO").length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
                  {asignacionesFiltradas.map((asig) => (
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => verBienes(asig)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Ver</span>
                          </Button>
                          {asig.estado === "ENVIADO" && (
                            <>
                              <Button
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => abrirDialogRespuesta(asig, "aceptar")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Aceptar</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs text-red-600"
                                onClick={() => abrirDialogRespuesta(asig, "rechazar")}
                              >
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
          </CardContent>
        </Card>
      )}

      {/* Dialog: Ver bienes de la asignación */}
      <Dialog open={dialogBienes} onOpenChange={setDialogBienes}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bienes Asignados
            </DialogTitle>
            {asignacionSeleccionada && (
              <DialogDescription>
                {asignacionSeleccionada.sesion.codigo} — {asignacionSeleccionada.sesion.nombre}
                {asignacionSeleccionada.sesion.sigaNombreDependencia && (
                  <span className="block text-xs">{asignacionSeleccionada.sesion.sigaNombreDependencia}</span>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          {loadingVerif ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : verificaciones.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron bienes
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[40px]">#</TableHead>
                    <TableHead className="text-xs">Código</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs">Marca/Modelo</TableHead>
                    <TableHead className="text-xs">Resultado</TableHead>
                    <TableHead className="hidden md:table-cell text-xs">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verificaciones.map((v, i) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs text-muted-foreground py-2">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs py-2">{v.codigoPatrimonial}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm py-2">
                        {v.descripcionSiga || "Sin información"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs py-2">
                        {[v.marcaSiga, v.modeloSiga].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="py-2">{getResultadoBadge(v.resultado)}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs py-2">
                        {v.estadoFisico || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            {asignacionSeleccionada?.estado === "ENVIADO" && (
              <>
                <Button
                  onClick={() => { setDialogBienes(false); abrirDialogRespuesta(asignacionSeleccionada, "aceptar") }}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Aceptar Asignación
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5 text-red-600"
                  onClick={() => { setDialogBienes(false); abrirDialogRespuesta(asignacionSeleccionada, "rechazar") }}
                >
                  <XCircle className="h-4 w-4" />
                  Rechazar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setDialogBienes(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRespuesta(false)}>
              Cancelar
            </Button>
            <Button
              onClick={enviarRespuesta}
              disabled={enviando || (accionDialog === "rechazar" && !observaciones.trim())}
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
