"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  ArrowRightLeft,
  Barcode,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  DollarSign,
  History,
  Info,
  Inbox,
  Loader2,
  MapPin,
  Package,
  PackageOpen,
  RefreshCw,
  Search,
  Send,
  Tag,
  Truck,
  User,
  UserCheck,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Interfaces ───
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

interface MiAsignacion {
  id: string
  estado: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  sesion: { codigo: string; nombre: string; sigaNombreDependencia: string | null }
  _count: { verificaciones: number }
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

interface UsuarioInfo {
  nombre: string
  documento: string
}

const OPCIONES_POR_PAGINA = [10, 20, 50, 100]

export default function MisBienesPage() {
  // ─── Bienes SIGA ───
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bienes, setBienes] = useState<BienPatrimonial[]>([])
  const [usuario, setUsuario] = useState<UsuarioInfo | null>(null)
  const [bienSeleccionado, setBienSeleccionado] = useState<BienPatrimonial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [busquedaSiga, setBusquedaSiga] = useState("")
  const [paginaSiga, setPaginaSiga] = useState(1)
  const [porPaginaSiga, setPorPaginaSiga] = useState(10)

  // ─── Bienes verificados (inventario) ───
  const [bienesVerificados, setBienesVerificados] = useState<MiBien[]>([])
  const [misAsignaciones, setMisAsignaciones] = useState<MiAsignacion[]>([])
  const [loadingVerificados, setLoadingVerificados] = useState(true)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [busquedaVerif, setBusquedaVerif] = useState("")
  const [paginaVerif, setPaginaVerif] = useState(1)
  const [porPaginaVerif, setPorPaginaVerif] = useState(10)
  const [aceptandoAsignacion, setAceptandoAsignacion] = useState<string | null>(null)

  // ─── Transferencias ───
  const [transferenciasRecibidas, setTransferenciasRecibidas] = useState<Transferencia[]>([])
  const [transferenciasEnviadas, setTransferenciasEnviadas] = useState<Transferencia[]>([])
  const [pagRecibidas, setPagRecibidas] = useState(1)
  const [porPagRecibidas, setPorPagRecibidas] = useState(10)
  const [pagEnviadas, setPagEnviadas] = useState(1)
  const [porPagEnviadas, setPorPagEnviadas] = useState(10)

  // ─── Dialog transferir ───
  const [dialogTransferir, setDialogTransferir] = useState(false)
  const [bienesATransferir, setBienesATransferir] = useState<MiBien[]>([])
  const [docDestinatario, setDocDestinatario] = useState("")
  const [buscandoDestinatario, setBuscandoDestinatario] = useState(false)
  const [destinatarioInfo, setDestinatarioInfo] = useState<{ nombre: string; usuarioId: string | null } | null>(null)
  const [motivoTransferencia, setMotivoTransferencia] = useState("")
  const [enviandoTransferencia, setEnviandoTransferencia] = useState(false)

  // ─── Dialog historial ───
  const [dialogHistorial, setDialogHistorial] = useState(false)
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [historialBien, setHistorialBien] = useState<{ codigo: string; descripcion: string } | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // ─── Dialog responder transferencia ───
  const [dialogResponder, setDialogResponder] = useState(false)
  const [transferenciaResponder, setTransferenciaResponder] = useState<Transferencia | null>(null)
  const [accionRespuesta, setAccionRespuesta] = useState<"aceptar" | "rechazar">("aceptar")
  const [obsRespuesta, setObsRespuesta] = useState("")
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false)

  // ─── Data fetching ───
  const cargarBienesSiga = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/patrimonio/mis-bienes")
      const data = await response.json()
      if (!response.ok) { setError(data.error || "Error al cargar los bienes"); return }
      setBienes(data.bienes)
      setUsuario(data.usuario)
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarBienesVerificados = useCallback(async () => {
    setLoadingVerificados(true)
    try {
      const [resBienes, resAsig] = await Promise.all([
        fetch("/api/inventario/verificaciones?misbienes=true&limit=500"),
        fetch("/api/inventario/asignaciones?mis=true"),
      ])
      const dataBienes = await resBienes.json()
      const dataAsig = await resAsig.json()
      if (resBienes.ok) setBienesVerificados(dataBienes.verificaciones || [])
      if (resAsig.ok) setMisAsignaciones(dataAsig.asignaciones || [])
    } catch { /* silenciar */ }
    finally { setLoadingVerificados(false) }
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
    cargarBienesSiga()
    cargarBienesVerificados()
    cargarTransferencias()
  }, [cargarBienesSiga, cargarBienesVerificados, cargarTransferencias])

  // ─── Paginación bienes SIGA ───
  const bienesSigaFiltrados = useMemo(() => {
    if (!busquedaSiga) return bienes
    const q = busquedaSiga.toLowerCase()
    return bienes.filter((b) =>
      b.codigo_patrimonial.toLowerCase().includes(q) ||
      b.descripcion.toLowerCase().includes(q) ||
      (b.marca || "").toLowerCase().includes(q) ||
      (b.serie || "").toLowerCase().includes(q)
    )
  }, [bienes, busquedaSiga])

  const totalPaginasSiga = Math.max(1, Math.ceil(bienesSigaFiltrados.length / porPaginaSiga))
  const bienesSigaPaginados = bienesSigaFiltrados.slice((paginaSiga - 1) * porPaginaSiga, paginaSiga * porPaginaSiga)
  useEffect(() => { setPaginaSiga(1) }, [busquedaSiga, porPaginaSiga])

  // ─── Paginación bienes verificados ───
  const bienesVerifFiltrados = useMemo(() => {
    if (!busquedaVerif) return bienesVerificados
    const q = busquedaVerif.toLowerCase()
    return bienesVerificados.filter((b) =>
      b.codigoPatrimonial.toLowerCase().includes(q) ||
      (b.descripcionSiga || "").toLowerCase().includes(q) ||
      (b.marcaSiga || "").toLowerCase().includes(q)
    )
  }, [bienesVerificados, busquedaVerif])

  const totalPaginasVerif = Math.max(1, Math.ceil(bienesVerifFiltrados.length / porPaginaVerif))
  const bienesVerifPaginados = bienesVerifFiltrados.slice((paginaVerif - 1) * porPaginaVerif, paginaVerif * porPaginaVerif)
  useEffect(() => { setPaginaVerif(1); setSeleccionados(new Set()) }, [busquedaVerif, porPaginaVerif])

  // ─── Paginación transferencias ───
  const totalPagRecibidas = Math.max(1, Math.ceil(transferenciasRecibidas.length / porPagRecibidas))
  const recibidasPaginadas = transferenciasRecibidas.slice((pagRecibidas - 1) * porPagRecibidas, pagRecibidas * porPagRecibidas)
  useEffect(() => { setPagRecibidas(1) }, [porPagRecibidas])

  const totalPagEnviadas = Math.max(1, Math.ceil(transferenciasEnviadas.length / porPagEnviadas))
  const enviadasPaginadas = transferenciasEnviadas.slice((pagEnviadas - 1) * porPagEnviadas, pagEnviadas * porPagEnviadas)
  useEffect(() => { setPagEnviadas(1) }, [porPagEnviadas])

  const pendientesRecibidas = transferenciasRecibidas.filter((t) => t.estado === "PENDIENTE")
  const asignacionesPendientes = misAsignaciones.filter((a) => a.estado === "ENVIADO")
  const valorTotal = bienes.reduce((acc, bien) => acc + (bien.valor_neto || 0), 0)

  // ─── Selección ───
  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  const toggleTodosPagina = () => {
    const ids = bienesVerifPaginados.map((b) => b.id)
    const todos = ids.every((id) => seleccionados.has(id))
    setSeleccionados((prev) => { const next = new Set(prev); ids.forEach((id) => todos ? next.delete(id) : next.add(id)); return next })
  }

  // ─── Acciones ───
  const aceptarAsignacion = async (asignacionId: string) => {
    setAceptandoAsignacion(asignacionId)
    try {
      const res = await fetch(`/api/inventario/asignaciones/${asignacionId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "aceptar" }),
      })
      const data = await res.json()
      if (res.ok) { toast.success("Asignación aceptada"); cargarBienesVerificados() }
      else toast.error(data.error || "Error al aceptar")
    } catch { toast.error("Error de conexión") }
    finally { setAceptandoAsignacion(null) }
  }

  const abrirTransferencia = (bienesArr: MiBien[]) => {
    setBienesATransferir(bienesArr); setDocDestinatario(""); setDestinatarioInfo(null); setMotivoTransferencia(""); setDialogTransferir(true)
  }

  const buscarDestinatario = async () => {
    if (!docDestinatario.trim() || docDestinatario.length < 8) return
    setBuscandoDestinatario(true)
    try {
      const res = await fetch(`/api/usuarios/buscar-documento?documento=${docDestinatario.trim()}&tipo=DNI`)
      const data = await res.json()
      if (res.ok && data.encontrado) setDestinatarioInfo({ nombre: `${data.datos.nombre} ${data.datos.apellidos}`, usuarioId: data.datos.usuarioId })
      else { setDestinatarioInfo(null); toast.error("Persona no encontrada") }
    } catch { toast.error("Error de conexión") }
    finally { setBuscandoDestinatario(false) }
  }

  const crearTransferencias = async () => {
    if (bienesATransferir.length === 0 || !destinatarioInfo) return
    setEnviandoTransferencia(true)
    let exitosos = 0, errores = 0
    for (const bien of bienesATransferir) {
      try {
        const res = await fetch("/api/inventario/transferencias", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificacionId: bien.id, dniDestinatario: docDestinatario.trim(), nombreDestinatario: destinatarioInfo.nombre, destinatarioId: destinatarioInfo.usuarioId, motivo: motivoTransferencia || null }),
        })
        if (res.ok) exitosos++; else errores++
      } catch { errores++ }
    }
    setEnviandoTransferencia(false); setDialogTransferir(false); setSeleccionados(new Set())
    if (exitosos > 0) toast.success(`${exitosos} transferencia(s) enviada(s)`)
    if (errores > 0) toast.error(`${errores} transferencia(s) fallaron`)
    cargarTransferencias(); cargarBienesVerificados()
  }

  const verHistorial = async (bien: MiBien) => {
    setHistorialBien({ codigo: bien.codigoPatrimonial, descripcion: bien.descripcionSiga || "" })
    setDialogHistorial(true); setLoadingHistorial(true)
    try {
      const res = await fetch(`/api/inventario/verificaciones/${bien.id}/historial`)
      const data = await res.json()
      if (res.ok) setHistorial(data.historial)
    } catch { toast.error("Error al cargar historial") }
    finally { setLoadingHistorial(false) }
  }

  const responderTransferencia = async () => {
    if (!transferenciaResponder) return
    if (accionRespuesta === "rechazar" && !obsRespuesta.trim()) { toast.error("Indique el motivo del rechazo"); return }
    setEnviandoRespuesta(true)
    try {
      const res = await fetch(`/api/inventario/transferencias/${transferenciaResponder.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: accionRespuesta, observaciones: obsRespuesta.trim() || null }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.mensaje); setDialogResponder(false); cargarBienesVerificados(); cargarTransferencias() }
      else toast.error(data.error || "Error")
    } catch { toast.error("Error de conexión") }
    finally { setEnviandoRespuesta(false) }
  }

  // ─── Helpers ───
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A"
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value)
  }

  const getEstadoTransfBadge = (estado: string) => {
    if (estado === "PENDIENTE") return <Badge className="bg-yellow-100 text-yellow-800 gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>
    if (estado === "ACEPTADA") return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" />Aceptada</Badge>
    return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="h-3 w-3" />Rechazada</Badge>
  }

  // ─── Componente de paginación reutilizable ───
  const Paginacion = ({ total, pagina, setPagina, porPag, setPorPag, label }: {
    total: number; pagina: number; setPagina: (v: number | ((p: number) => number)) => void
    porPag: number; setPorPag: (v: number) => void; label: string
  }) => {
    const totalPags = Math.max(1, Math.ceil(total / porPag))
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Mostrar</span>
          <Select value={String(porPag)} onValueChange={(v) => setPorPag(Number(v))}>
            <SelectTrigger className="h-8 w-[70px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPCIONES_POR_PAGINA.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">de {total} {label}</span>
        </div>
        {totalPags > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagina <= 1} onClick={() => setPagina((p: number) => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm px-2 min-w-[60px] text-center">{pagina} / {totalPags}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={pagina >= totalPags} onClick={() => setPagina((p: number) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mis Bienes Patrimoniales</h1>
          <p className="text-sm text-muted-foreground">
            Bienes asignados a tu cargo, transferencias y verificaciones de inventario
          </p>
        </div>
        <Button variant="outline" onClick={() => { cargarBienesSiga(); cargarBienesVerificados(); cargarTransferencias(); setSeleccionados(new Set()) }} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Resumen */}
      {usuario && !loading && !error && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-[#1e3a5f] p-2"><User className="h-5 w-5 text-white" /></div>
              <div><p className="text-xs text-muted-foreground">Usuario</p><p className="font-medium text-sm">{usuario.nombre}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2"><Package className="h-5 w-5 text-white" /></div>
              <div><p className="text-xs text-muted-foreground">Total de Bienes SIGA</p><p className="font-bold text-lg">{bienes.length}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-green-600 p-2"><DollarSign className="h-5 w-5 text-white" /></div>
              <div><p className="text-xs text-muted-foreground">Valor Total Neto</p><p className="font-bold text-lg text-green-700">{formatCurrency(valorTotal)}</p></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Asignaciones pendientes de aceptar */}
      {asignacionesPendientes.map((asig) => (
        <Card key={asig.id} className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <ClipboardList className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Asignación pendiente de aceptar</p>
                  <p className="text-xs text-amber-700">{asig.sesion.codigo} — {asig.sesion.nombre} — {asig._count.verificaciones} bien(es)</p>
                </div>
              </div>
              <Button size="sm" className="gap-1.5 shrink-0" disabled={aceptandoAsignacion === asig.id} onClick={() => aceptarAsignacion(asig.id)}>
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
            <p className="text-sm font-medium text-blue-800">{pendientesRecibidas.length} transferencia(s) pendiente(s) de aceptar</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="bienes-siga">
        <TabsList className="w-full grid grid-cols-4 sm:flex sm:w-auto">
          <TabsTrigger value="bienes-siga" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">SIGA ({bienes.length})</span>
          </TabsTrigger>
          <TabsTrigger value="verificados" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-4">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Verificados ({bienesVerificados.length})</span>
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

        {/* ═══ Tab: Bienes SIGA ═══ */}
        <TabsContent value="bienes-siga" className="space-y-3 mt-4">
          {loading ? (
            <Card><CardContent className="p-12 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" /><p className="mt-3 text-muted-foreground text-sm">Cargando bienes de SIGA...</p></CardContent></Card>
          ) : error ? (
            <Card className="border-red-200 bg-red-50"><CardContent className="p-4 flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-600" /><div><p className="text-red-800 font-medium">Error</p><p className="text-red-600 text-sm">{error}</p></div></CardContent></Card>
          ) : bienes.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-6 sm:p-12 text-center"><PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/50" /><h3 className="mt-4 text-lg font-medium">No tienes bienes asignados</h3><p className="mt-2 text-sm text-muted-foreground">No se encontraron bienes patrimoniales registrados a tu nombre en SIGA</p></CardContent></Card>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por código, descripción, marca o serie..." value={busquedaSiga} onChange={(e) => setBusquedaSiga(e.target.value)} className="pl-9" />
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap text-xs">Código</TableHead>
                          <TableHead className="text-xs">Descripción</TableHead>
                          <TableHead className="hidden md:table-cell text-xs">Dependencia</TableHead>
                          <TableHead className="hidden lg:table-cell text-xs">Ubicación</TableHead>
                          <TableHead className="hidden sm:table-cell text-xs">Marca</TableHead>
                          <TableHead className="text-right hidden sm:table-cell text-xs">Valor Neto</TableHead>
                          <TableHead className="text-right text-xs">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bienesSigaPaginados.map((item) => (
                          <TableRow key={item.codigo_patrimonial} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap py-2">{item.codigo_patrimonial}</TableCell>
                            <TableCell className="max-w-[150px] sm:max-w-[200px] truncate text-sm py-2">{item.descripcion}</TableCell>
                            <TableCell className="hidden md:table-cell max-w-[150px] truncate text-xs py-2">{item.abreviatura || item.nombre_depend || "N/A"}</TableCell>
                            <TableCell className="hidden lg:table-cell max-w-[150px] truncate text-xs py-2">{item.ubicacion_fisica || "N/A"}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs py-2">{item.marca || "N/A"}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell font-medium text-xs py-2">{formatCurrency(item.valor_neto)}</TableCell>
                            <TableCell className="text-right py-2">
                              <Button size="sm" variant="outline" className="h-8" onClick={() => { setBienSeleccionado(item); setModalOpen(true) }}>
                                <Search className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">Ver</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Paginacion total={bienesSigaFiltrados.length} pagina={paginaSiga} setPagina={setPaginaSiga} porPag={porPaginaSiga} setPorPag={setPorPaginaSiga} label="bienes" />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══ Tab: Bienes Verificados ═══ */}
        <TabsContent value="verificados" className="space-y-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código, descripción o marca..." value={busquedaVerif} onChange={(e) => setBusquedaVerif(e.target.value)} className="pl-9" />
            </div>
            {seleccionados.size > 0 && (
              <Button className="gap-2" onClick={() => abrirTransferencia(bienesVerificados.filter((b) => seleccionados.has(b.id)))}>
                <ArrowRightLeft className="h-4 w-4" />Transferir {seleccionados.size} bien(es)
              </Button>
            )}
          </div>

          {loadingVerificados ? (
            <Card><CardContent className="p-12 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : bienesVerifFiltrados.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-6 sm:p-12 text-center"><Package className="mx-auto h-12 w-12 text-muted-foreground/50" /><h3 className="mt-4 text-lg font-medium">Sin bienes verificados</h3><p className="mt-2 text-sm text-muted-foreground">{busquedaVerif ? "No se encontraron bienes con la búsqueda" : "No tienes bienes verificados en inventario"}</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px] px-2">
                          <Checkbox checked={bienesVerifPaginados.length > 0 && bienesVerifPaginados.every((b) => seleccionados.has(b.id))} onCheckedChange={toggleTodosPagina} />
                        </TableHead>
                        <TableHead className="text-xs">Código</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs">Descripción</TableHead>
                        <TableHead className="hidden md:table-cell text-xs">Marca/Modelo</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs">Estado</TableHead>
                        <TableHead className="text-xs text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bienesVerifPaginados.map((bien) => (
                        <TableRow key={bien.id} className={seleccionados.has(bien.id) ? "bg-primary/5" : ""}>
                          <TableCell className="px-2 py-2"><Checkbox checked={seleccionados.has(bien.id)} onCheckedChange={() => toggleSeleccion(bien.id)} /></TableCell>
                          <TableCell className="py-2">
                            <div className="font-mono text-xs sm:text-sm">{bien.codigoPatrimonial}</div>
                            <div className="sm:hidden text-[10px] text-muted-foreground truncate max-w-[150px]">{bien.descripcionSiga || "Sin info"}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-sm py-2">{bien.descripcionSiga || "Sin información"}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs py-2">{[bien.marcaSiga, bien.modeloSiga].filter(Boolean).join(" ") || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs py-2">{bien.estadoFisico || "—"}</TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => verHistorial(bien)} title="Historial"><History className="h-4 w-4" /></Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => abrirTransferencia([bien])} title="Transferir"><ArrowRightLeft className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Paginacion total={bienesVerifFiltrados.length} pagina={paginaVerif} setPagina={setPaginaVerif} porPag={porPaginaVerif} setPorPag={setPorPaginaVerif} label={`bienes${seleccionados.size > 0 ? ` (${seleccionados.size} seleccionados)` : ""}`} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Tab: Transferencias Recibidas ═══ */}
        <TabsContent value="recibidas" className="mt-4">
          {transferenciasRecibidas.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-6 text-center"><Inbox className="mx-auto h-10 w-10 text-muted-foreground/50" /><p className="mt-2 text-sm text-muted-foreground">No hay transferencias recibidas</p></CardContent></Card>
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
                      {recibidasPaginadas.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs py-2">{t.codigoPatrimonial}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm py-2">
                            {t.verificacion.descripcionSiga || t.codigoPatrimonial}
                            <div className="sm:hidden text-[10px] text-muted-foreground">De: {t.nombreRemitente}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs py-2 truncate max-w-[120px]">{t.nombreRemitente}</TableCell>
                          <TableCell className="py-2">{getEstadoTransfBadge(t.estado)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground py-2">{new Date(t.fechaSolicitud).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</TableCell>
                          <TableCell className="text-right py-2">
                            {t.estado === "PENDIENTE" && (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => { setTransferenciaResponder(t); setAccionRespuesta("aceptar"); setObsRespuesta(""); setDialogResponder(true) }}>
                                  <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Aceptar</span>
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-red-600" onClick={() => { setTransferenciaResponder(t); setAccionRespuesta("rechazar"); setObsRespuesta(""); setDialogResponder(true) }}>
                                  <XCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Rechazar</span>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Paginacion total={transferenciasRecibidas.length} pagina={pagRecibidas} setPagina={setPagRecibidas} porPag={porPagRecibidas} setPorPag={setPorPagRecibidas} label="recibidas" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Tab: Transferencias Enviadas ═══ */}
        <TabsContent value="enviadas" className="mt-4">
          {transferenciasEnviadas.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-6 text-center"><Send className="mx-auto h-10 w-10 text-muted-foreground/50" /><p className="mt-2 text-sm text-muted-foreground">No has enviado transferencias</p></CardContent></Card>
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
                      {enviadasPaginadas.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs py-2">{t.codigoPatrimonial}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm py-2">
                            {t.verificacion.descripcionSiga || t.codigoPatrimonial}
                            <div className="sm:hidden text-[10px] text-muted-foreground">Para: {t.nombreDestinatario}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs py-2 truncate max-w-[120px]">{t.nombreDestinatario}</TableCell>
                          <TableCell className="py-2">{getEstadoTransfBadge(t.estado)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground py-2">{new Date(t.fechaSolicitud).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs py-2 max-w-[150px] truncate">{t.observacionesDestinatario || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Paginacion total={transferenciasEnviadas.length} pagina={pagEnviadas} setPagina={setPagEnviadas} porPag={porPagEnviadas} setPorPag={setPorPagEnviadas} label="enviadas" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ Modal detalle bien SIGA ═══ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-5xl w-[90vw] max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="rounded-lg bg-[#1e3a5f] p-2"><Package className="h-5 w-5 text-white" /></div>
              <div>
                <span className="font-mono">{bienSeleccionado?.codigo_patrimonial}</span>
                {bienSeleccionado?.codigo_barra && <Badge variant="outline" className="ml-2 font-mono text-xs"><Barcode className="mr-1 h-3 w-3" />{bienSeleccionado.codigo_barra}</Badge>}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {bienSeleccionado && (
              <div className="p-4 sm:p-6 pt-4 space-y-4">
                <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Descripción</p><p className="font-medium">{bienSeleccionado.descripcion}</p></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"><MapPin className="h-5 w-5 text-muted-foreground mt-0.5" /><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Sede</p><p className="font-medium text-sm">{bienSeleccionado.nombre_sede || "N/A"}</p></div></div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"><Building2 className="h-5 w-5 text-muted-foreground mt-0.5" /><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Dependencia</p><p className="font-medium text-sm">{bienSeleccionado.nombre_depend || "N/A"}</p>{bienSeleccionado.abreviatura && <p className="text-xs text-muted-foreground">({bienSeleccionado.abreviatura})</p>}</div></div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"><Info className="h-5 w-5 text-muted-foreground mt-0.5" /><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Ubicación Física</p><p className="font-medium text-sm">{bienSeleccionado.ubicacion_fisica || "N/A"}</p></div></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"><UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Responsable</p><p className="font-medium text-sm">{bienSeleccionado.responsable || "N/A"}</p></div></div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"><User className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Usuario Final</p><p className="font-medium text-sm">{bienSeleccionado.usuario || "N/A"}</p></div></div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 text-sm flex items-center gap-2"><Tag className="h-4 w-4" />Información del Bien</h4>
                  <div className="p-3 rounded-lg border bg-muted/30 mb-3"><p className="text-xs text-muted-foreground">Nombre del Item</p><p className="font-medium text-sm">{bienSeleccionado.nombre_item || "N/A"}</p></div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[{ l: "Marca", v: bienSeleccionado.marca }, { l: "Modelo", v: bienSeleccionado.modelo }, { l: "Serie", v: bienSeleccionado.serie, mono: true }, { l: "Color", v: bienSeleccionado.color }, { l: "Medidas", v: bienSeleccionado.medidas }].map((f) => (
                      <div key={f.l} className="p-2 sm:p-3 rounded-lg border"><p className="text-xs text-muted-foreground">{f.l}</p><p className={`font-medium text-xs sm:text-sm truncate ${f.mono ? "font-mono" : ""}`}>{f.v || "N/A"}</p></div>
                    ))}
                  </div>
                </div>
                {bienSeleccionado.caracteristicas && <div className="p-3 rounded-lg border"><p className="text-xs text-muted-foreground mb-1">Características</p><p className="text-sm">{bienSeleccionado.caracteristicas}</p></div>}
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Información de Adquisición</h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[{ icon: Calendar, l: "Fecha Compra", v: bienSeleccionado.fecha_compra || "N/A" }, { icon: DollarSign, l: "Valor Compra", v: formatCurrency(bienSeleccionado.valor_compra) }, { icon: Calendar, l: "Fecha Alta", v: bienSeleccionado.fecha_alta || "N/A" }, { icon: DollarSign, l: "Valor Inicial", v: formatCurrency(bienSeleccionado.valor_inicial) }].map((f, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border"><f.icon className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">{f.l}</p><p className="font-medium text-sm">{f.v}</p></div></div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200"><CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /><div><p className="text-xs text-green-600">Valor Neto Actual</p><p className="font-bold text-lg text-green-800">{formatCurrency(bienSeleccionado.valor_neto)}</p></div></div>
                  <div className="flex items-start gap-3 p-3 rounded-lg border"><Truck className="h-5 w-5 text-muted-foreground mt-0.5" /><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Proveedor</p><p className="font-medium text-sm truncate">{bienSeleccionado.proveedor || "N/A"}</p></div></div>
                </div>
                {bienSeleccionado.observaciones && <><Separator /><div><h4 className="font-medium mb-2 text-sm">Observaciones</h4><p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">{bienSeleccionado.observaciones}</p></div></>}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Transferir bienes ═══ */}
      <Dialog open={dialogTransferir} onOpenChange={(open) => { setDialogTransferir(open); if (!open) { setBienesATransferir([]); setDocDestinatario(""); setDestinatarioInfo(null); setMotivoTransferencia("") } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" />Transferir {bienesATransferir.length} bien(es)</DialogTitle>
            <DialogDescription>Busca al destinatario por DNI. Debe aceptar la transferencia.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[120px] overflow-y-auto border rounded-md p-2 space-y-1">
            {bienesATransferir.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-xs"><Package className="h-3 w-3 text-muted-foreground shrink-0" /><span className="font-mono">{b.codigoPatrimonial}</span><span className="text-muted-foreground truncate">{b.descripcionSiga || ""}</span></div>
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
              {destinatarioInfo && <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200 text-sm"><User className="h-4 w-4 text-green-600" /><span className="text-green-800">{destinatarioInfo.nombre}</span></div>}
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

      {/* ═══ Dialog: Historial ═══ */}
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
                <div key={i} className="flex gap-3 p-3 rounded-lg border">
                  <div className="shrink-0 mt-0.5">{h.tipo === "TRANSFERENCIA" ? <ArrowRightLeft className="h-4 w-4 text-blue-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}</div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-medium">{h.tipo}</span>{getEstadoTransfBadge(h.estado)}</div>
                    {h.de && <p className="text-xs text-muted-foreground mt-1">De: {h.de}</p>}
                    <p className="text-xs text-muted-foreground">Para: {h.para}</p>
                    {h.motivo && <p className="text-xs mt-1">Motivo: {h.motivo}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(h.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Responder transferencia ═══ */}
      <Dialog open={dialogResponder} onOpenChange={setDialogResponder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{accionRespuesta === "aceptar" ? "Aceptar Transferencia" : "Rechazar Transferencia"}</DialogTitle>
            <DialogDescription>
              {accionRespuesta === "aceptar" ? "Al aceptar, el bien pasará a ser tu responsabilidad." : "Indica el motivo del rechazo."}
            </DialogDescription>
          </DialogHeader>
          {transferenciaResponder && (
            <div className="p-3 rounded-md bg-muted text-sm space-y-1">
              <p><strong>Bien:</strong> {transferenciaResponder.codigoPatrimonial}</p>
              <p><strong>De:</strong> {transferenciaResponder.nombreRemitente}</p>
              {transferenciaResponder.motivo && <p><strong>Motivo:</strong> {transferenciaResponder.motivo}</p>}
            </div>
          )}
          <div className="grid gap-2">
            <Label>{accionRespuesta === "aceptar" ? "Observaciones (opcional)" : "Motivo del rechazo *"}</Label>
            <Textarea placeholder={accionRespuesta === "aceptar" ? "Observaciones..." : "Motivo del rechazo..."} value={obsRespuesta} onChange={(e) => setObsRespuesta(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogResponder(false)}>Cancelar</Button>
            <Button onClick={responderTransferencia} disabled={enviandoRespuesta || (accionRespuesta === "rechazar" && !obsRespuesta.trim())} variant={accionRespuesta === "aceptar" ? "default" : "destructive"}>
              {enviandoRespuesta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {accionRespuesta === "aceptar" ? "Confirmar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
