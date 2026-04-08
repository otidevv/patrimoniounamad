"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  Package,
  Loader2,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Send,
  User,
  AlertTriangle,
  Inbox,
  ClipboardList,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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

interface MiAsignacion {
  id: string
  estado: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  sesion: { codigo: string; nombre: string; sigaNombreDependencia: string | null }
  _count: { verificaciones: number }
}

interface MiBien {
  id: string
  codigoPatrimonial: string
  descripcionSiga: string | null
  marcaSiga: string | null
  modeloSiga: string | null
  serieSiga: string | null
  estadoFisico: string | null
  resultado: string
  sesionId: string
  sesion: { codigo: string; nombre: string }
}

interface Transferencia {
  id: string
  codigoPatrimonial: string
  descripcionBien: string | null
  nombreRemitente: string
  dniRemitente: string
  nombreDestinatario: string
  dniDestinatario: string
  estado: string
  motivo: string | null
  observacionesDestinatario: string | null
  fechaSolicitud: string
  fechaRespuesta: string | null
  remitente: { id: string; nombre: string; apellidos: string } | null
  destinatario: { id: string; nombre: string; apellidos: string } | null
  verificacion: { id: string; codigoPatrimonial: string; descripcionSiga: string | null }
}

interface HistorialItem {
  tipo: string
  fecha: string
  de: string | null
  para: string
  estado: string
  motivo: string | null
  observaciones: string | null
}

const ITEMS_POR_PAGINA = 15

export default function MisBienesAsignadosPage() {
  const [bienes, setBienes] = useState<MiBien[]>([])
  const [misAsignaciones, setMisAsignaciones] = useState<MiAsignacion[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [paginaActual, setPaginaActual] = useState(1)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [transferenciasRecibidas, setTransferenciasRecibidas] = useState<Transferencia[]>([])
  const [transferenciasEnviadas, setTransferenciasEnviadas] = useState<Transferencia[]>([])
  const [aceptandoAsignacion, setAceptandoAsignacion] = useState<string | null>(null)

  // Dialog transferir (uno o varios)
  const [dialogTransferir, setDialogTransferir] = useState(false)
  const [bienesATransferir, setBienesATransferir] = useState<MiBien[]>([])
  const [docDestinatario, setDocDestinatario] = useState("")
  const [buscandoDestinatario, setBuscandoDestinatario] = useState(false)
  const [destinatarioInfo, setDestinatarioInfo] = useState<{ nombre: string; usuarioId: string | null } | null>(null)
  const [motivoTransferencia, setMotivoTransferencia] = useState("")
  const [enviandoTransferencia, setEnviandoTransferencia] = useState(false)

  // Dialog historial
  const [dialogHistorial, setDialogHistorial] = useState(false)
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [historialBien, setHistorialBien] = useState<{ codigo: string; descripcion: string } | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // Dialog responder transferencia
  const [dialogResponder, setDialogResponder] = useState(false)
  const [transferenciaResponder, setTransferenciaResponder] = useState<Transferencia | null>(null)
  const [accionRespuesta, setAccionRespuesta] = useState<"aceptar" | "rechazar">("aceptar")
  const [obsRespuesta, setObsRespuesta] = useState("")
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)

  const cargarMisBienes = useCallback(async () => {
    try {
      setLoading(true)
      const [resBienes, resAsig] = await Promise.all([
        fetch("/api/inventario/verificaciones?misbienes=true&limit=500"),
        fetch("/api/inventario/asignaciones?mis=true"),
      ])
      const dataBienes = await resBienes.json()
      const dataAsig = await resAsig.json()
      if (resBienes.ok) setBienes(dataBienes.verificaciones || [])
      if (resAsig.ok) setMisAsignaciones(dataAsig.asignaciones || [])
    } catch {
      toast.error("Error al cargar bienes")
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarTransferencias = useCallback(async () => {
    try {
      const [resR, resE] = await Promise.all([
        fetch("/api/inventario/transferencias?tipo=recibidas"),
        fetch("/api/inventario/transferencias?tipo=enviadas"),
      ])
      const dataR = await resR.json()
      const dataE = await resE.json()
      if (resR.ok) setTransferenciasRecibidas(dataR.transferencias)
      if (resE.ok) setTransferenciasEnviadas(dataE.transferencias)
    } catch { /* silenciar */ }
  }, [])

  useEffect(() => {
    cargarMisBienes()
    cargarTransferencias()
  }, [cargarMisBienes, cargarTransferencias])

  // Filtros y paginación
  const bienesFiltrados = useMemo(() =>
    bienes.filter((b) =>
      b.codigoPatrimonial.toLowerCase().includes(busqueda.toLowerCase()) ||
      (b.descripcionSiga || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (b.marcaSiga || "").toLowerCase().includes(busqueda.toLowerCase())
    ), [bienes, busqueda])

  const totalPaginas = Math.ceil(bienesFiltrados.length / ITEMS_POR_PAGINA)
  const bienesPaginados = bienesFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  )

  useEffect(() => { setPaginaActual(1); setSeleccionados(new Set()) }, [busqueda])

  const pendientesRecibidas = transferenciasRecibidas.filter((t) => t.estado === "PENDIENTE")
  const asignacionesPendientes = misAsignaciones.filter((a) => a.estado === "ENVIADO")

  // Selección
  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTodosPagina = () => {
    const idsPagina = bienesPaginados.map((b) => b.id)
    const todosSeleccionados = idsPagina.every((id) => seleccionados.has(id))
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (todosSeleccionados) {
        idsPagina.forEach((id) => next.delete(id))
      } else {
        idsPagina.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const aceptarAsignacion = async (asignacionId: string) => {
    setAceptandoAsignacion(asignacionId)
    try {
      const res = await fetch(`/api/inventario/asignaciones/${asignacionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "aceptar" }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Asignación aceptada. Los bienes ahora son tu responsabilidad.")
        cargarMisBienes()
      } else {
        toast.error(data.error || "Error al aceptar")
      }
    } catch { toast.error("Error de conexión") }
    finally { setAceptandoAsignacion(null) }
  }

  // Transferir
  const abrirTransferencia = (bienesArr: MiBien[]) => {
    setBienesATransferir(bienesArr)
    setDocDestinatario("")
    setDestinatarioInfo(null)
    setMotivoTransferencia("")
    setDialogTransferir(true)
  }

  const buscarDestinatario = async () => {
    if (!docDestinatario.trim() || docDestinatario.length < 8) return
    setBuscandoDestinatario(true)
    try {
      const res = await fetch(`/api/usuarios/buscar-documento?documento=${docDestinatario.trim()}&tipo=DNI`)
      const data = await res.json()
      if (res.ok && data.encontrado) {
        setDestinatarioInfo({ nombre: `${data.datos.nombre} ${data.datos.apellidos}`, usuarioId: data.datos.usuarioId })
      } else {
        setDestinatarioInfo(null)
        toast.error("Persona no encontrada")
      }
    } catch { toast.error("Error de conexión") }
    finally { setBuscandoDestinatario(false) }
  }

  const crearTransferencias = async () => {
    if (bienesATransferir.length === 0 || !destinatarioInfo) return
    setEnviandoTransferencia(true)
    let exitosos = 0
    let errores = 0
    for (const bien of bienesATransferir) {
      try {
        const res = await fetch("/api/inventario/transferencias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificacionId: bien.id,
            dniDestinatario: docDestinatario.trim(),
            nombreDestinatario: destinatarioInfo.nombre,
            destinatarioId: destinatarioInfo.usuarioId,
            motivo: motivoTransferencia || null,
          }),
        })
        if (res.ok) exitosos++
        else errores++
      } catch { errores++ }
    }
    setEnviandoTransferencia(false)
    setDialogTransferir(false)
    setSeleccionados(new Set())
    if (exitosos > 0) toast.success(`${exitosos} transferencia(s) enviada(s)`)
    if (errores > 0) toast.error(`${errores} transferencia(s) fallaron`)
    cargarTransferencias()
    cargarMisBienes()
  }

  const verHistorial = async (bien: MiBien) => {
    setHistorialBien({ codigo: bien.codigoPatrimonial, descripcion: bien.descripcionSiga || "" })
    setDialogHistorial(true)
    setLoadingHistorial(true)
    try {
      const res = await fetch(`/api/inventario/verificaciones/${bien.id}/historial`)
      const data = await res.json()
      if (res.ok) setHistorial(data.historial)
    } catch { toast.error("Error al cargar historial") }
    finally { setLoadingHistorial(false) }
  }

  const responderTransferencia = async () => {
    if (!transferenciaResponder) return
    if (accionRespuesta === "rechazar" && !obsRespuesta.trim()) {
      toast.error("Indique el motivo del rechazo"); return
    }
    setEnviandoRespuesta(true)
    try {
      const res = await fetch(`/api/inventario/transferencias/${transferenciaResponder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: accionRespuesta, observaciones: obsRespuesta.trim() || null }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensaje)
        setDialogResponder(false)
        cargarMisBienes()
        cargarTransferencias()
      } else { toast.error(data.error || "Error") }
    } catch { toast.error("Error de conexión") }
    finally { setEnviandoRespuesta(false) }
  }

  const getEstadoTransfBadge = (estado: string) => {
    if (estado === "PENDIENTE") return <Badge className="bg-yellow-100 text-yellow-800 gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>
    if (estado === "ACEPTADA") return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" />Aceptada</Badge>
    return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="h-3 w-3" />Rechazada</Badge>
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mis Bienes Asignados</h1>
        <p className="text-sm text-muted-foreground">
          Bienes bajo tu responsabilidad. Puedes transferirlos y ver su historial.
        </p>
      </div>

      {/* Asignaciones pendientes de aceptar */}
      {asignacionesPendientes.map((asig) => (
        <Card key={asig.id} className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ClipboardList className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Asignación pendiente de aceptar</p>
                  <p className="text-xs text-amber-700">{asig.sesion.codigo} — {asig.sesion.nombre}</p>
                  <p className="text-xs text-amber-700">{asig._count.verificaciones} bien(es){asig.sesion.sigaNombreDependencia && ` — ${asig.sesion.sigaNombreDependencia}`}</p>
                </div>
              </div>
              <Button size="sm" className="gap-1.5 h-9 shrink-0" disabled={aceptandoAsignacion === asig.id} onClick={() => aceptarAsignacion(asig.id)}>
                {aceptandoAsignacion === asig.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aceptar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Alerta transferencias recibidas */}
      {pendientesRecibidas.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <Inbox className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm font-medium text-blue-800 flex-1">
              {pendientesRecibidas.length} transferencia(s) pendiente(s) de aceptar
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="bienes">
        <TabsList className="w-full grid grid-cols-3 sm:flex sm:w-auto">
          <TabsTrigger value="bienes" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">Bienes ({bienes.length})</span>
          </TabsTrigger>
          <TabsTrigger value="recibidas" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <Inbox className="h-4 w-4 shrink-0" />
            <span className="truncate">Recibidas</span>
            {pendientesRecibidas.length > 0 && <Badge className="ml-1 bg-blue-600 text-white text-[10px] px-1.5">{pendientesRecibidas.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="enviadas" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <Send className="h-4 w-4 shrink-0" />
            <span className="truncate">Enviadas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Mis Bienes */}
        <TabsContent value="bienes" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código, descripción o marca..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
            </div>
            {seleccionados.size > 0 && (
              <Button className="gap-2" onClick={() => {
                const bienesArr = bienes.filter((b) => seleccionados.has(b.id))
                abrirTransferencia(bienesArr)
              }}>
                <ArrowRightLeft className="h-4 w-4" />
                Transferir {seleccionados.size} bien(es)
              </Button>
            )}
            <Button variant="outline" onClick={() => { cargarMisBienes(); setSeleccionados(new Set()) }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {bienesFiltrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 sm:p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Sin bienes asignados</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {busqueda ? "No se encontraron bienes con la búsqueda" : "No tienes bienes patrimoniales bajo tu responsabilidad"}
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
                        <TableHead className="w-[40px] px-2">
                          <Checkbox
                            checked={bienesPaginados.length > 0 && bienesPaginados.every((b) => seleccionados.has(b.id))}
                            onCheckedChange={toggleTodosPagina}
                          />
                        </TableHead>
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">Descripción</TableHead>
                        <TableHead className="hidden md:table-cell text-xs">Marca/Modelo</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs">Estado</TableHead>
                        <TableHead className="text-xs text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bienesPaginados.map((bien) => (
                        <TableRow key={bien.id} className={seleccionados.has(bien.id) ? "bg-primary/5" : ""}>
                          <TableCell className="px-2 py-2">
                            <Checkbox
                              checked={seleccionados.has(bien.id)}
                              onCheckedChange={() => toggleSeleccion(bien.id)}
                            />
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="font-mono text-xs sm:text-sm">{bien.codigoPatrimonial}</div>
                            <div className="sm:hidden text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {bien.descripcionSiga || "Sin info"}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-sm py-2">
                            {bien.descripcionSiga || "Sin información"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs py-2">
                            {[bien.marcaSiga, bien.modeloSiga].filter(Boolean).join(" ") || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs py-2">
                            {bien.estadoFisico || "—"}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => verHistorial(bien)} title="Historial">
                                <History className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => abrirTransferencia([bien])} title="Transferir">
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {seleccionados.size > 0 ? `${seleccionados.size} seleccionado(s) — ` : ""}
                    {bienesFiltrados.length} bien(es)
                  </p>
                  {totalPaginas > 1 && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {paginaActual} / {totalPaginas}
                      </span>
                      <Button variant="outline" size="sm" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Transferencias Recibidas */}
        <TabsContent value="recibidas" className="mt-4">
          {transferenciasRecibidas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No hay transferencias recibidas</p>
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
                        <TableHead className="text-xs">Descripción</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">De</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="hidden md:table-cell text-xs">Fecha</TableHead>
                        <TableHead className="text-xs text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferenciasRecibidas.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs py-2">{t.codigoPatrimonial}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm py-2">
                            {t.verificacion.descripcionSiga || t.codigoPatrimonial}
                            <div className="sm:hidden text-[10px] text-muted-foreground">De: {t.nombreRemitente}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs py-2 truncate max-w-[120px]">{t.nombreRemitente}</TableCell>
                          <TableCell className="py-2">{getEstadoTransfBadge(t.estado)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground py-2">
                            {new Date(t.fechaSolicitud).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            {t.estado === "PENDIENTE" && (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => {
                                  setTransferenciaResponder(t); setAccionRespuesta("aceptar"); setObsRespuesta(""); setDialogResponder(true)
                                }}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Aceptar</span>
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-red-600" onClick={() => {
                                  setTransferenciaResponder(t); setAccionRespuesta("rechazar"); setObsRespuesta(""); setDialogResponder(true)
                                }}>
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Rechazar</span>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Transferencias Enviadas */}
        <TabsContent value="enviadas" className="mt-4">
          {transferenciasEnviadas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Send className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No has enviado transferencias</p>
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
                        <TableHead className="text-xs">Descripción</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">Para</TableHead>
                        <TableHead className="text-xs">Estado</TableHead>
                        <TableHead className="hidden md:table-cell text-xs">Fecha</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs">Observación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferenciasEnviadas.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs py-2">{t.codigoPatrimonial}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm py-2">
                            {t.verificacion.descripcionSiga || t.codigoPatrimonial}
                            <div className="sm:hidden text-[10px] text-muted-foreground">Para: {t.nombreDestinatario}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs py-2 truncate max-w-[120px]">{t.nombreDestinatario}</TableCell>
                          <TableCell className="py-2">{getEstadoTransfBadge(t.estado)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground py-2">
                            {new Date(t.fechaSolicitud).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs py-2 max-w-[150px] truncate">
                            {t.observacionesDestinatario || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Transferir bienes */}
      <Dialog open={dialogTransferir} onOpenChange={(open) => { setDialogTransferir(open); if (!open) { setBienesATransferir([]); setDocDestinatario(""); setDestinatarioInfo(null); setMotivoTransferencia("") } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transferir {bienesATransferir.length} bien(es)
            </DialogTitle>
            <DialogDescription>Busca al destinatario por DNI. Debe aceptar la transferencia.</DialogDescription>
          </DialogHeader>

          {/* Lista de bienes a transferir */}
          <div className="max-h-[120px] overflow-y-auto border rounded-md p-2 space-y-1">
            {bienesATransferir.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs">
                <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-mono">{b.codigoPatrimonial}</span>
                <span className="text-muted-foreground truncate">{b.descripcionSiga || ""}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>DNI del destinatario *</Label>
              <div className="flex gap-2">
                <Input placeholder="DNI (8 dígitos)..." value={docDestinatario} onChange={(e) => { setDocDestinatario(e.target.value.replace(/\D/g, "").slice(0, 8)); setDestinatarioInfo(null) }} maxLength={8} className="font-mono" />
                <Button variant="outline" onClick={buscarDestinatario} disabled={buscandoDestinatario || docDestinatario.length !== 8}>
                  {buscandoDestinatario ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {destinatarioInfo && (
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200 text-sm">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">{destinatarioInfo.nombre}</span>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Motivo</Label>
              <Textarea placeholder="Motivo de la transferencia..." value={motivoTransferencia} onChange={(e) => setMotivoTransferencia(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTransferir(false)}>Cancelar</Button>
            <Button onClick={crearTransferencias} disabled={enviandoTransferencia || !destinatarioInfo}>
              {enviandoTransferencia && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar {bienesATransferir.length > 1 ? `${bienesATransferir.length} transferencias` : "transferencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial */}
      <Dialog open={dialogHistorial} onOpenChange={setDialogHistorial}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" />Historial</DialogTitle>
            {historialBien && <DialogDescription>{historialBien.descripcion} — <span className="font-mono">{historialBien.codigo}</span></DialogDescription>}
          </DialogHeader>
          {loadingHistorial ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : historial.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Sin movimientos</p>
          ) : (
            <div className="space-y-3">
              {historial.map((h, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`rounded-full p-1.5 ${h.tipo === "ASIGNACION" ? "bg-blue-100" : h.estado === "ACEPTADA" ? "bg-green-100" : h.estado === "RECHAZADA" ? "bg-red-100" : "bg-yellow-100"}`}>
                      {h.tipo === "ASIGNACION" ? <Package className="h-3.5 w-3.5 text-blue-600" /> : h.estado === "ACEPTADA" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : h.estado === "RECHAZADA" ? <XCircle className="h-3.5 w-3.5 text-red-600" /> : <Clock className="h-3.5 w-3.5 text-yellow-600" />}
                    </div>
                    {i < historial.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-sm font-medium">
                      {h.tipo === "ASIGNACION" ? "Asignación inicial" : "Transferencia"}
                      {h.estado !== "COMPLETADA" && h.estado !== "ACEPTADA" && <Badge className="ml-2 text-[10px]" variant="outline">{h.estado}</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.de ? `${h.de} → ${h.para}` : `Asignado a ${h.para}`}</p>
                    {h.motivo && <p className="text-xs text-muted-foreground">Motivo: {h.motivo}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(h.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Responder Transferencia */}
      <Dialog open={dialogResponder} onOpenChange={setDialogResponder}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{accionRespuesta === "aceptar" ? "Aceptar Transferencia" : "Rechazar Transferencia"}</DialogTitle>
            <DialogDescription>{accionRespuesta === "aceptar" ? "El bien pasará a ser tu responsabilidad." : "Indica el motivo del rechazo."}</DialogDescription>
          </DialogHeader>
          {transferenciaResponder && (
            <div className="p-3 rounded-md bg-muted text-sm">
              <p className="font-medium">{transferenciaResponder.verificacion.descripcionSiga}</p>
              <p className="text-xs text-muted-foreground">De: {transferenciaResponder.nombreRemitente} — {transferenciaResponder.codigoPatrimonial}</p>
            </div>
          )}
          <div className="grid gap-2">
            <Label>{accionRespuesta === "aceptar" ? "Observaciones (opcional)" : "Motivo del rechazo *"}</Label>
            <Textarea value={obsRespuesta} onChange={(e) => setObsRespuesta(e.target.value)} placeholder={accionRespuesta === "aceptar" ? "Observaciones..." : "Motivo..."} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogResponder(false)}>Cancelar</Button>
            <Button onClick={responderTransferencia} disabled={enviandoRespuesta || (accionRespuesta === "rechazar" && !obsRespuesta.trim())} variant={accionRespuesta === "aceptar" ? "default" : "destructive"}>
              {enviandoRespuesta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accionRespuesta === "aceptar" ? "Aceptar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
