"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Fraunces, JetBrains_Mono } from "next/font/google"
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
  Hash,
  Sparkles,
  ArrowUpRight,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
})
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
})

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

// ─── Componentes auxiliares reusables ───
function FichaCell({
  icon: Icon,
  label,
  value,
  sub,
  mono = false,
  tone = "default",
}: {
  icon: LucideIcon
  label: string
  value: string | null
  sub?: string
  mono?: boolean
  tone?: "default" | "muted"
}) {
  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
        tone === "muted"
          ? "border-slate-100 bg-slate-50/40 hover:bg-slate-50"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      )}
    >
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 transition-colors group-hover:bg-[#0c1f3a] group-hover:text-amber-200">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-sm font-medium text-slate-900 truncate",
            mono && jetbrains.className
          )}
          title={value || undefined}
        >
          {value || <span className="text-slate-400">—</span>}
        </p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionTitle({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow?: string
  title: string
  icon?: LucideIcon
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        {eyebrow && (
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
            {eyebrow}
          </span>
        )}
        <h3
          className={cn(
            fraunces.className,
            "text-lg leading-tight text-slate-900"
          )}
        >
          {title}
        </h3>
      </div>
      {Icon && (
        <div className="text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

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
      if (!response.ok) {
        setError(data?.error || "Error al cargar los bienes")
        return
      }
      setBienes(Array.isArray(data?.bienes) ? data.bienes : [])
      setUsuario(data?.usuario ?? null)
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
    } catch {
      /* silenciar */
    } finally {
      setLoadingVerificados(false)
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
      if (resR.ok) setTransferenciasRecibidas(dataR.transferencias || [])
      if (resE.ok) setTransferenciasEnviadas(dataE.transferencias || [])
    } catch {
      /* silenciar */
    }
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
    return bienes.filter(
      (b) =>
        b.codigo_patrimonial.toLowerCase().includes(q) ||
        b.descripcion.toLowerCase().includes(q) ||
        (b.marca || "").toLowerCase().includes(q) ||
        (b.serie || "").toLowerCase().includes(q)
    )
  }, [bienes, busquedaSiga])

  // Página clamped para evitar out-of-range tras cambios de datos
  const totalPagsSiga = Math.max(1, Math.ceil(bienesSigaFiltrados.length / porPaginaSiga))
  const paginaSigaSafe = Math.min(paginaSiga, totalPagsSiga)
  const bienesSigaPaginados = bienesSigaFiltrados.slice(
    (paginaSigaSafe - 1) * porPaginaSiga,
    paginaSigaSafe * porPaginaSiga
  )
  useEffect(() => {
    setPaginaSiga(1)
  }, [busquedaSiga, porPaginaSiga])

  // ─── Paginación bienes verificados ───
  const bienesVerifFiltrados = useMemo(() => {
    if (!busquedaVerif) return bienesVerificados
    const q = busquedaVerif.toLowerCase()
    return bienesVerificados.filter(
      (b) =>
        b.codigoPatrimonial.toLowerCase().includes(q) ||
        (b.descripcionSiga || "").toLowerCase().includes(q) ||
        (b.marcaSiga || "").toLowerCase().includes(q)
    )
  }, [bienesVerificados, busquedaVerif])

  const totalPagsVerif = Math.max(1, Math.ceil(bienesVerifFiltrados.length / porPaginaVerif))
  const paginaVerifSafe = Math.min(paginaVerif, totalPagsVerif)
  const bienesVerifPaginados = bienesVerifFiltrados.slice(
    (paginaVerifSafe - 1) * porPaginaVerif,
    paginaVerifSafe * porPaginaVerif
  )
  useEffect(() => {
    setPaginaVerif(1)
    setSeleccionados(new Set())
  }, [busquedaVerif, porPaginaVerif])

  // ─── Paginación transferencias ───
  const totalPagsRec = Math.max(1, Math.ceil(transferenciasRecibidas.length / porPagRecibidas))
  const pagRecibidasSafe = Math.min(pagRecibidas, totalPagsRec)
  const recibidasPaginadas = transferenciasRecibidas.slice(
    (pagRecibidasSafe - 1) * porPagRecibidas,
    pagRecibidasSafe * porPagRecibidas
  )
  useEffect(() => {
    setPagRecibidas(1)
  }, [porPagRecibidas])

  const totalPagsEnv = Math.max(1, Math.ceil(transferenciasEnviadas.length / porPagEnviadas))
  const pagEnviadasSafe = Math.min(pagEnviadas, totalPagsEnv)
  const enviadasPaginadas = transferenciasEnviadas.slice(
    (pagEnviadasSafe - 1) * porPagEnviadas,
    pagEnviadasSafe * porPagEnviadas
  )
  useEffect(() => {
    setPagEnviadas(1)
  }, [porPagEnviadas])

  // Sincroniza state si la página calculada está fuera de rango
  useEffect(() => {
    if (paginaSiga !== paginaSigaSafe) setPaginaSiga(paginaSigaSafe)
  }, [paginaSiga, paginaSigaSafe])
  useEffect(() => {
    if (paginaVerif !== paginaVerifSafe) setPaginaVerif(paginaVerifSafe)
  }, [paginaVerif, paginaVerifSafe])
  useEffect(() => {
    if (pagRecibidas !== pagRecibidasSafe) setPagRecibidas(pagRecibidasSafe)
  }, [pagRecibidas, pagRecibidasSafe])
  useEffect(() => {
    if (pagEnviadas !== pagEnviadasSafe) setPagEnviadas(pagEnviadasSafe)
  }, [pagEnviadas, pagEnviadasSafe])

  const pendientesRecibidas = transferenciasRecibidas.filter(
    (t) => t.estado === "PENDIENTE"
  )
  const asignacionesPendientes = misAsignaciones.filter(
    (a) => a.estado === "ENVIADO"
  )
  const valorTotal = bienes.reduce(
    (acc, bien) => acc + (bien.valor_neto || 0),
    0
  )

  // ─── Selección ───
  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleTodosPagina = () => {
    const ids = bienesVerifPaginados.map((b) => b.id)
    const todos = ids.every((id) => seleccionados.has(id))
    setSeleccionados((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (todos ? next.delete(id) : next.add(id)))
      return next
    })
  }

  // ─── Acciones ───
  const aceptarAsignacion = async (asignacionId: string) => {
    setAceptandoAsignacion(asignacionId)
    try {
      const res = await fetch(
        `/api/inventario/asignaciones/${asignacionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "aceptar" }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success("Asignación aceptada")
        cargarBienesVerificados()
      } else toast.error(data.error || "Error al aceptar")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setAceptandoAsignacion(null)
    }
  }

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
      const res = await fetch(
        `/api/usuarios/buscar-documento?documento=${docDestinatario.trim()}&tipo=DNI`
      )
      const data = await res.json()
      if (res.ok && data?.encontrado && data?.datos) {
        setDestinatarioInfo({
          nombre: `${data.datos.nombre ?? ""} ${data.datos.apellidos ?? ""}`.trim(),
          usuarioId: data.datos.usuarioId ?? null,
        })
      } else {
        setDestinatarioInfo(null)
        toast.error("Persona no encontrada")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setBuscandoDestinatario(false)
    }
  }

  const crearTransferencias = async () => {
    if (bienesATransferir.length === 0 || !destinatarioInfo) return
    setEnviandoTransferencia(true)
    let exitosos = 0,
      errores = 0
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
      } catch {
        errores++
      }
    }
    setEnviandoTransferencia(false)
    setDialogTransferir(false)
    setSeleccionados(new Set())
    if (exitosos > 0) toast.success(`${exitosos} transferencia(s) enviada(s)`)
    if (errores > 0) toast.error(`${errores} transferencia(s) fallaron`)
    cargarTransferencias()
    cargarBienesVerificados()
  }

  const verHistorial = async (bien: MiBien) => {
    setHistorialBien({
      codigo: bien.codigoPatrimonial,
      descripcion: bien.descripcionSiga || "",
    })
    setHistorial([])
    setDialogHistorial(true)
    setLoadingHistorial(true)
    try {
      const res = await fetch(
        `/api/inventario/verificaciones/${bien.id}/historial`
      )
      const data = await res.json()
      if (res.ok) setHistorial(Array.isArray(data?.historial) ? data.historial : [])
      else toast.error(data?.error || "Error al cargar historial")
    } catch {
      toast.error("Error al cargar historial")
    } finally {
      setLoadingHistorial(false)
    }
  }

  const responderTransferencia = async () => {
    if (!transferenciaResponder) return
    if (accionRespuesta === "rechazar" && !obsRespuesta.trim()) {
      toast.error("Indique el motivo del rechazo")
      return
    }
    setEnviandoRespuesta(true)
    try {
      const res = await fetch(
        `/api/inventario/transferencias/${transferenciaResponder.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: accionRespuesta,
            observaciones: obsRespuesta.trim() || null,
          }),
        }
      )
      const data = await res.json()
      if (res.ok) {
        toast.success(data.mensaje)
        setDialogResponder(false)
        cargarBienesVerificados()
        cargarTransferencias()
      } else toast.error(data.error || "Error")
    } catch {
      toast.error("Error de conexión")
    } finally {
      setEnviandoRespuesta(false)
    }
  }

  // ─── Helpers ───
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return null
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value)
  }

  const getEstadoTransfBadge = (estado: string) => {
    if (estado === "PENDIENTE")
      return (
        <Badge className="gap-1 border border-amber-200 bg-amber-50 text-amber-800">
          <Clock className="h-3 w-3" />
          Pendiente
        </Badge>
      )
    if (estado === "ACEPTADA")
      return (
        <Badge className="gap-1 border border-emerald-200 bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          Aceptada
        </Badge>
      )
    return (
      <Badge className="gap-1 border border-rose-200 bg-rose-50 text-rose-800">
        <XCircle className="h-3 w-3" />
        Rechazada
      </Badge>
    )
  }

  // Barras decorativas estilo código de barras para el hero
  const barcodePattern = [3, 5, 2, 6, 4, 3, 7, 2, 5, 4, 3, 6, 2, 5, 3, 4, 6, 3, 2, 5, 4, 3]

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col gap-6 p-3 sm:p-5 md:p-6",
        fraunces.variable,
        jetbrains.variable
      )}
    >
      {/* =================== HERO con resumen =================== */}
      <section
        className="relative overflow-hidden rounded-[28px] border border-slate-900/5 bg-gradient-to-br from-[#081a30] via-[#102b4d] to-[#0c1f3a] shadow-[0_20px_60px_-20px_rgba(12,31,58,0.45)]"
        style={{ animation: "fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber-400/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-6 top-6 hidden items-end gap-[3px] opacity-25 md:flex"
          style={{ height: "calc(100% - 3rem)" }}
        >
          {barcodePattern.map((w, i) => (
            <div
              key={i}
              style={{
                width: `${w}px`,
                height: `${55 + ((i * 7) % 40)}%`,
              }}
              className="bg-gradient-to-b from-amber-200 to-amber-200/30"
            />
          ))}
        </div>

        <div className="relative px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-12">
          <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px w-10 bg-amber-300" />
                <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/90 sm:text-xs">
                  Mi Archivo Patrimonial · UNAMAD
                </span>
              </div>
              <h1
                className={cn(
                  fraunces.className,
                  "text-[2rem] font-light leading-[1.02] tracking-tight text-white sm:text-5xl md:text-[3.25rem]"
                )}
              >
                Mis <em className="font-normal italic text-amber-100">bienes</em>
                <br className="hidden sm:inline" />{" "}
                <span className="text-slate-300/90">patrimoniales.</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
                Bienes bajo tu custodia, verificaciones de inventario y
                transferencias pendientes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                cargarBienesSiga()
                cargarBienesVerificados()
                cargarTransferencias()
                setSeleccionados(new Set())
              }}
              disabled={loading}
              className={cn(
                "group inline-flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-full border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-all",
                "hover:border-white/60 hover:bg-white/20",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1f3a]"
              )}
            >
              <RefreshCw
                className={cn("h-4 w-4", loading && "animate-spin")}
              />
              Actualizar
            </button>
          </div>

          {/* Stats row */}
          {usuario && !loading && !error && (
            <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-amber-200" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200/80">
                    Usuario
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-white">
                  {usuario.nombre}
                </p>
                <p
                  className={cn(
                    jetbrains.className,
                    "mt-0.5 text-[10px] text-slate-400"
                  )}
                >
                  DNI {usuario.documento}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-amber-200" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200/80">
                    Total en SIGA
                  </span>
                </div>
                <p
                  className={cn(
                    jetbrains.className,
                    "mt-1.5 text-2xl font-medium text-white"
                  )}
                >
                  {bienes.length}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  bienes registrados
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-200" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-200/90">
                    Valor neto total
                  </span>
                </div>
                <p
                  className={cn(
                    fraunces.className,
                    "mt-1.5 text-2xl font-medium leading-none tracking-tight text-emerald-100"
                  )}
                >
                  {formatCurrency(valorTotal) || "—"}
                </p>
                <p className="mt-1 text-[10px] text-emerald-200/70">
                  Depreciación SIGA aplicada
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =================== ALERTAS PENDIENTES =================== */}
      {asignacionesPendientes.map((asig) => (
        <div
          key={asig.id}
          className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 sm:px-5 sm:py-4"
          style={{
            animation: "fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100">
                <ClipboardList className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Asignación pendiente de aceptar
                </p>
                <p className="text-xs text-amber-700">
                  <span className={jetbrains.className}>{asig.sesion.codigo}</span> · {asig.sesion.nombre} ·{" "}
                  {asig._count.verificaciones} bien(es)
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 gap-1.5 bg-[#0c1f3a] hover:bg-[#0a1a30]"
              disabled={aceptandoAsignacion === asig.id}
              onClick={() => aceptarAsignacion(asig.id)}
            >
              {aceptandoAsignacion === asig.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Aceptar
            </Button>
          </div>
        </div>
      ))}

      {pendientesRecibidas.length > 0 && (
        <div
          className="relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 sm:px-5 sm:py-4"
          style={{
            animation: "fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-100">
              <Inbox className="h-4 w-4 text-sky-700" />
            </div>
            <p className="text-sm font-semibold text-sky-900">
              {pendientesRecibidas.length} transferencia
              {pendientesRecibidas.length === 1 ? "" : "s"} pendiente
              {pendientesRecibidas.length === 1 ? "" : "s"} de aceptar
            </p>
          </div>
        </div>
      )}

      {/* =================== TABS =================== */}
      <Tabs defaultValue="bienes-siga" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-1.5 shadow-sm">
          {[
            {
              value: "bienes-siga",
              icon: Package,
              label: "SIGA",
              count: bienes.length,
            },
            {
              value: "verificados",
              icon: CheckCircle2,
              label: "Verificados",
              count: bienesVerificados.length,
            },
            {
              value: "recibidas",
              icon: Inbox,
              label: "Recibidas",
              count: pendientesRecibidas.length,
              highlight: true,
            },
            {
              value: "enviadas",
              icon: Send,
              label: "Enviadas",
            },
          ].map(({ value, icon: Icon, label, count, highlight }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "group flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-sm",
                "data-[state=active]:bg-[#0c1f3a] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-slate-900/15",
                "data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex items-center gap-1.5">
                {label}
                {typeof count === "number" && count > 0 && (
                  <span
                    className={cn(
                      jetbrains.className,
                      "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold transition-colors",
                      highlight
                        ? "bg-amber-300 text-slate-900"
                        : "bg-slate-200/80 text-slate-700 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white"
                    )}
                  >
                    {count}
                  </span>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ Tab: Bienes SIGA ═══ */}
        <TabsContent value="bienes-siga" className="mt-4 space-y-3">
          {loading ? (
            <SkeletonTabla />
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-rose-100">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-rose-900">Error</p>
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              </div>
            </div>
          ) : bienes.length === 0 ? (
            <EmptyState
              icon={PackageOpen}
              title="No tienes bienes asignados"
              body="No se encontraron bienes patrimoniales registrados a tu nombre en SIGA"
            />
          ) : (
            <>
              <SearchBar
                value={busquedaSiga}
                onChange={setBusquedaSiga}
                placeholder="Buscar por código, descripción, marca o serie..."
              />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="h-11 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Código
                        </TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Descripción
                        </TableHead>
                        <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:table-cell">
                          Dependencia
                        </TableHead>
                        <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:table-cell">
                          Ubicación
                        </TableHead>
                        <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:table-cell">
                          Marca
                        </TableHead>
                        <TableHead className="hidden text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:table-cell">
                          Valor neto
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Acción
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bienesSigaPaginados.map((item, idx) => (
                        <TableRow
                          key={item.codigo_patrimonial}
                          className="group cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/70"
                          onClick={() => {
                            setBienSeleccionado(item)
                            setModalOpen(true)
                          }}
                          style={{
                            animation: `fadeSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.02}s both`,
                          }}
                        >
                          <TableCell
                            className={cn(
                              jetbrains.className,
                              "whitespace-nowrap py-2 text-xs font-medium text-[#0c1f3a] sm:text-sm"
                            )}
                          >
                            {item.codigo_patrimonial}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate py-2 text-sm sm:max-w-[200px]">
                            {item.descripcion}
                          </TableCell>
                          <TableCell className="hidden max-w-[150px] truncate py-2 text-xs text-slate-600 md:table-cell">
                            {item.abreviatura || item.nombre_depend || "—"}
                          </TableCell>
                          <TableCell className="hidden max-w-[150px] truncate py-2 text-xs text-slate-600 lg:table-cell">
                            {item.ubicacion_fisica || "—"}
                          </TableCell>
                          <TableCell className="hidden py-2 text-xs text-slate-600 sm:table-cell">
                            {item.marca || "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              jetbrains.className,
                              "hidden py-2 text-right text-xs font-medium text-slate-900 sm:table-cell"
                            )}
                          >
                            {formatCurrency(item.valor_neto) || "—"}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setBienSeleccionado(item)
                                setModalOpen(true)
                              }}
                              aria-label={`Ver ficha de ${item.codigo_patrimonial}`}
                              className={cn(
                                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-all",
                                "group-hover:border-[#0c1f3a] group-hover:bg-[#0c1f3a] group-hover:text-white",
                                "hover:border-[#0c1f3a] hover:bg-[#0a1a30] hover:text-white",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a] focus-visible:ring-offset-1"
                              )}
                            >
                              <span className="hidden sm:inline">Ver ficha</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Paginacion
                  total={bienesSigaFiltrados.length}
                  pagina={paginaSigaSafe}
                  setPagina={setPaginaSiga}
                  porPag={porPaginaSiga}
                  setPorPag={setPorPaginaSiga}
                  label="bienes"
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* ═══ Tab: Bienes Verificados ═══ */}
        <TabsContent value="verificados" className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchBar
              value={busquedaVerif}
              onChange={setBusquedaVerif}
              placeholder="Buscar por código, descripción o marca..."
            />
            {seleccionados.size > 0 && (
              <Button
                className="shrink-0 gap-2 bg-[#0c1f3a] hover:bg-[#0a1a30]"
                onClick={() =>
                  abrirTransferencia(
                    bienesVerificados.filter((b) => seleccionados.has(b.id))
                  )
                }
              >
                <ArrowRightLeft className="h-4 w-4" />
                Transferir {seleccionados.size} bien(es)
              </Button>
            )}
          </div>

          {loadingVerificados ? (
            <SkeletonTabla />
          ) : bienesVerifFiltrados.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Sin bienes verificados"
              body={
                busquedaVerif
                  ? "No se encontraron bienes con esa búsqueda"
                  : "No tienes bienes verificados en inventario"
              }
            />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="h-11 w-[40px] px-2">
                        <Checkbox
                          checked={
                            bienesVerifPaginados.length > 0 &&
                            bienesVerifPaginados.every((b) =>
                              seleccionados.has(b.id)
                            )
                          }
                          onCheckedChange={toggleTodosPagina}
                        />
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Código
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:table-cell">
                        Descripción
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:table-cell">
                        Marca/Modelo
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:table-cell">
                        Estado
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bienesVerifPaginados.map((bien, idx) => (
                      <TableRow
                        key={bien.id}
                        className={cn(
                          "group border-slate-100 transition-colors",
                          seleccionados.has(bien.id)
                            ? "bg-[#0c1f3a]/5 hover:bg-[#0c1f3a]/10"
                            : "hover:bg-slate-50/70"
                        )}
                        style={{
                          animation: `fadeSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.02}s both`,
                        }}
                      >
                        <TableCell className="px-2 py-2">
                          <Checkbox
                            checked={seleccionados.has(bien.id)}
                            onCheckedChange={() => toggleSeleccion(bien.id)}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <div
                            className={cn(
                              jetbrains.className,
                              "text-xs font-medium text-[#0c1f3a] sm:text-sm"
                            )}
                          >
                            {bien.codigoPatrimonial}
                          </div>
                          <div className="truncate max-w-[150px] text-[10px] text-slate-500 sm:hidden">
                            {bien.descripcionSiga || "Sin info"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate py-2 text-sm sm:table-cell">
                          {bien.descripcionSiga || "Sin información"}
                        </TableCell>
                        <TableCell className="hidden py-2 text-xs text-slate-600 md:table-cell">
                          {[bien.marcaSiga, bien.modeloSiga]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </TableCell>
                        <TableCell className="hidden py-2 text-xs text-slate-600 lg:table-cell">
                          {bien.estadoFisico || "—"}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => verHistorial(bien)}
                              title="Ver historial"
                              className={cn(
                                "grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-transparent text-slate-500 transition-all",
                                "hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30"
                              )}
                            >
                              <History className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirTransferencia([bien])}
                              title="Transferir"
                              className={cn(
                                "grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all",
                                "hover:border-[#0c1f3a] hover:bg-[#0c1f3a] hover:text-white",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30"
                              )}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Paginacion
                total={bienesVerifFiltrados.length}
                pagina={paginaVerifSafe}
                setPagina={setPaginaVerif}
                porPag={porPaginaVerif}
                setPorPag={setPorPaginaVerif}
                label={`bienes${
                  seleccionados.size > 0
                    ? ` (${seleccionados.size} seleccionados)`
                    : ""
                }`}
              />
            </div>
          )}
        </TabsContent>

        {/* ═══ Tab: Transferencias Recibidas ═══ */}
        <TabsContent value="recibidas" className="mt-4">
          {transferenciasRecibidas.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Sin transferencias recibidas"
              body="Cuando alguien te transfiera un bien, aparecerá aquí."
            />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="h-11 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Código
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Descripción
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:table-cell">
                        De
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Estado
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:table-cell">
                        Fecha
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recibidasPaginadas.map((t, idx) => (
                      <TableRow
                        key={t.id}
                        className="group border-slate-100 transition-colors hover:bg-slate-50/70"
                        style={{
                          animation: `fadeSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.02}s both`,
                        }}
                      >
                        <TableCell
                          className={cn(
                            jetbrains.className,
                            "py-2 text-xs font-medium text-[#0c1f3a]"
                          )}
                        >
                          {t.codigoPatrimonial}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate py-2 text-sm">
                          {t.verificacion.descripcionSiga || t.codigoPatrimonial}
                          <div className="text-[10px] text-slate-500 sm:hidden">
                            De: {t.nombreRemitente}
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-[120px] truncate py-2 text-xs text-slate-600 sm:table-cell">
                          {t.nombreRemitente}
                        </TableCell>
                        <TableCell className="py-2">
                          {getEstadoTransfBadge(t.estado)}
                        </TableCell>
                        <TableCell className="hidden py-2 text-xs text-slate-500 md:table-cell">
                          {new Date(t.fechaSolicitud).toLocaleDateString(
                            "es-PE",
                            { day: "numeric", month: "short" }
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {t.estado === "PENDIENTE" && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                className="h-7 gap-1 bg-[#0c1f3a] text-xs hover:bg-[#0a1a30]"
                                onClick={() => {
                                  setTransferenciaResponder(t)
                                  setAccionRespuesta("aceptar")
                                  setObsRespuesta("")
                                  setDialogResponder(true)
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                  Aceptar
                                </span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                  setTransferenciaResponder(t)
                                  setAccionRespuesta("rechazar")
                                  setObsRespuesta("")
                                  setDialogResponder(true)
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                  Rechazar
                                </span>
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Paginacion
                total={transferenciasRecibidas.length}
                pagina={pagRecibidasSafe}
                setPagina={setPagRecibidas}
                porPag={porPagRecibidas}
                setPorPag={setPorPagRecibidas}
                label="recibidas"
              />
            </div>
          )}
        </TabsContent>

        {/* ═══ Tab: Transferencias Enviadas ═══ */}
        <TabsContent value="enviadas" className="mt-4">
          {transferenciasEnviadas.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Sin transferencias enviadas"
              body="Cuando transfieras un bien a otra persona, aparecerá aquí."
            />
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      <TableHead className="h-11 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Código
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Descripción
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:table-cell">
                        Para
                      </TableHead>
                      <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Estado
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:table-cell">
                        Fecha
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:table-cell">
                        Observación
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enviadasPaginadas.map((t, idx) => (
                      <TableRow
                        key={t.id}
                        className="border-slate-100 transition-colors hover:bg-slate-50/70"
                        style={{
                          animation: `fadeSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.02}s both`,
                        }}
                      >
                        <TableCell
                          className={cn(
                            jetbrains.className,
                            "py-2 text-xs font-medium text-[#0c1f3a]"
                          )}
                        >
                          {t.codigoPatrimonial}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate py-2 text-sm">
                          {t.verificacion.descripcionSiga || t.codigoPatrimonial}
                          <div className="text-[10px] text-slate-500 sm:hidden">
                            Para: {t.nombreDestinatario}
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-[120px] truncate py-2 text-xs text-slate-600 sm:table-cell">
                          {t.nombreDestinatario}
                        </TableCell>
                        <TableCell className="py-2">
                          {getEstadoTransfBadge(t.estado)}
                        </TableCell>
                        <TableCell className="hidden py-2 text-xs text-slate-500 md:table-cell">
                          {new Date(t.fechaSolicitud).toLocaleDateString(
                            "es-PE",
                            { day: "numeric", month: "short" }
                          )}
                        </TableCell>
                        <TableCell className="hidden max-w-[150px] truncate py-2 text-xs text-slate-600 lg:table-cell">
                          {t.observacionesDestinatario || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Paginacion
                total={transferenciasEnviadas.length}
                pagina={pagEnviadasSafe}
                setPagina={setPagEnviadas}
                porPag={porPagEnviadas}
                setPorPag={setPorPagEnviadas}
                label="enviadas"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* =================== MODAL DETALLE BIEN SIGA =================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className={cn(
            fraunces.variable,
            jetbrains.variable,
            "flex max-h-[85vh] w-[92vw] flex-col overflow-hidden p-0 sm:max-w-5xl",
            "[&>[data-slot=dialog-close]]:top-5 [&>[data-slot=dialog-close]]:right-5 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:bg-white/10 [&>[data-slot=dialog-close]]:p-1.5 [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:opacity-90 [&>[data-slot=dialog-close]]:ring-offset-[#0c1f3a] hover:[&>[data-slot=dialog-close]]:bg-white/20 hover:[&>[data-slot=dialog-close]]:opacity-100"
          )}
        >
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-[#0c1f3a] via-[#112b4d] to-[#0c1f3a] p-4 sm:p-5">
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur">
                <Package className="h-4 w-4 text-amber-200" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200/80">
                  Ficha de registro
                </div>
                <div
                  className={cn(
                    jetbrains.className,
                    "mt-0.5 text-base font-medium sm:text-lg"
                  )}
                >
                  {bienSeleccionado?.codigo_patrimonial}
                </div>
              </div>
              {bienSeleccionado?.codigo_barra && (
                <Badge
                  variant="outline"
                  className={cn(
                    jetbrains.className,
                    "ml-auto hidden border-white/40 bg-white/10 text-[10px] text-white sm:inline-flex"
                  )}
                >
                  <Barcode className="mr-1 h-3 w-3" />
                  {bienSeleccionado.codigo_barra}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {bienSeleccionado && (
              <div className="space-y-6 p-4 sm:p-6 md:p-8">
                <div className="rounded-xl border-l-2 border-[#0c1f3a] bg-slate-50/60 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Descripción
                  </p>
                  <p
                    className={cn(
                      fraunces.className,
                      "mt-1 text-base leading-snug text-slate-900 sm:text-lg"
                    )}
                  >
                    {bienSeleccionado.descripcion}
                  </p>
                </div>

                <div>
                  <SectionTitle
                    eyebrow="Localización"
                    title="Dónde se encuentra"
                    icon={MapPin}
                  />
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <FichaCell
                      icon={MapPin}
                      label="Sede"
                      value={bienSeleccionado.nombre_sede}
                    />
                    <FichaCell
                      icon={Building2}
                      label="Dependencia"
                      value={bienSeleccionado.nombre_depend}
                      sub={
                        bienSeleccionado.abreviatura
                          ? `(${bienSeleccionado.abreviatura})`
                          : undefined
                      }
                    />
                    <FichaCell
                      icon={Info}
                      label="Ubicación física"
                      value={bienSeleccionado.ubicacion_fisica}
                    />
                  </div>
                </div>

                <div>
                  <SectionTitle
                    eyebrow="Custodia"
                    title="Responsables"
                    icon={UserCheck}
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <FichaCell
                      icon={UserCheck}
                      label="Responsable"
                      value={bienSeleccionado.responsable}
                    />
                    <FichaCell
                      icon={User}
                      label="Usuario final"
                      value={bienSeleccionado.usuario}
                    />
                  </div>
                </div>

                <div>
                  <SectionTitle
                    eyebrow="Identificación"
                    title="Información del bien"
                    icon={Tag}
                  />
                  <div className="mb-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40 px-3.5 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Nombre del item
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {bienSeleccionado.nombre_item || "—"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    <FichaCell
                      icon={Tag}
                      label="Marca"
                      value={bienSeleccionado.marca}
                      tone="muted"
                    />
                    <FichaCell
                      icon={Tag}
                      label="Modelo"
                      value={bienSeleccionado.modelo}
                      tone="muted"
                    />
                    <FichaCell
                      icon={Hash}
                      label="Serie"
                      value={bienSeleccionado.serie}
                      mono
                      tone="muted"
                    />
                    <FichaCell
                      icon={Sparkles}
                      label="Color"
                      value={bienSeleccionado.color}
                      tone="muted"
                    />
                    <FichaCell
                      icon={Info}
                      label="Medidas"
                      value={bienSeleccionado.medidas}
                      tone="muted"
                    />
                  </div>
                </div>

                {bienSeleccionado.caracteristicas && (
                  <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-4 py-4">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      Características
                    </span>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                      {bienSeleccionado.caracteristicas}
                    </p>
                  </div>
                )}

                <div>
                  <SectionTitle
                    eyebrow="Adquisición"
                    title="Historial económico"
                    icon={DollarSign}
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    <FichaCell
                      icon={Calendar}
                      label="Fecha compra"
                      value={bienSeleccionado.fecha_compra}
                    />
                    <FichaCell
                      icon={DollarSign}
                      label="Valor compra"
                      value={formatCurrency(bienSeleccionado.valor_compra)}
                      mono
                    />
                    <FichaCell
                      icon={Calendar}
                      label="Fecha alta"
                      value={bienSeleccionado.fecha_alta}
                    />
                    <FichaCell
                      icon={DollarSign}
                      label="Valor inicial"
                      value={formatCurrency(bienSeleccionado.valor_inicial)}
                      mono
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white p-4 sm:col-span-2">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl"
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-700">
                          Valor neto
                        </span>
                      </div>
                      <p
                        className={cn(
                          fraunces.className,
                          "mt-2 text-2xl font-medium leading-none tracking-tight text-emerald-900 sm:text-3xl"
                        )}
                      >
                        {formatCurrency(bienSeleccionado.valor_neto) || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:col-span-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                        Proveedor
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {bienSeleccionado.proveedor || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {bienSeleccionado.observaciones && (
                  <div className="rounded-2xl border-l-2 border-[#0c1f3a] bg-slate-50/60 px-5 py-4">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                      Observaciones
                    </span>
                    <p
                      className={cn(
                        fraunces.className,
                        "mt-2 text-sm italic leading-relaxed text-slate-700"
                      )}
                    >
                      {bienSeleccionado.observaciones}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* =================== DIALOG TRANSFERIR =================== */}
      <Dialog
        open={dialogTransferir}
        onOpenChange={(open) => {
          setDialogTransferir(open)
          if (!open) {
            setBienesATransferir([])
            setDocDestinatario("")
            setDestinatarioInfo(null)
            setMotivoTransferencia("")
          }
        }}
      >
        <DialogContent
          className={cn(
            fraunces.variable,
            jetbrains.variable,
            "max-h-[90vh] max-w-lg overflow-y-auto"
          )}
        >
          <DialogHeader>
            <DialogTitle
              className={cn(fraunces.className, "flex items-center gap-2 text-xl")}
            >
              <ArrowRightLeft className="h-5 w-5 text-[#0c1f3a]" />
              Transferir {bienesATransferir.length} bien(es)
            </DialogTitle>
            <DialogDescription>
              Busca al destinatario por DNI. Debe aceptar la transferencia.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[120px] space-y-1 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/40 p-2">
            {bienesATransferir.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 text-xs"
              >
                <Package className="h-3 w-3 shrink-0 text-slate-400" />
                <span className={cn(jetbrains.className, "text-[#0c1f3a]")}>
                  {b.codigoPatrimonial}
                </span>
                <span className="truncate text-slate-500">
                  {b.descripcionSiga || ""}
                </span>
              </div>
            ))}
          </div>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                DNI del destinatario *
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="DNI (8 dígitos)..."
                    value={docDestinatario}
                    onChange={(e) => {
                      setDocDestinatario(
                        e.target.value.replace(/\D/g, "").slice(0, 8)
                      )
                      setDestinatarioInfo(null)
                    }}
                    maxLength={8}
                    inputMode="numeric"
                    className={cn(
                      jetbrains.className,
                      "border-slate-200 pr-10 tracking-[0.1em] focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10"
                    )}
                  />
                  {docDestinatario && (
                    <button
                      type="button"
                      onClick={() => {
                        setDocDestinatario("")
                        setDestinatarioInfo(null)
                      }}
                      aria-label="Limpiar DNI"
                      className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={buscarDestinatario}
                  disabled={buscandoDestinatario || docDestinatario.length !== 8}
                >
                  {buscandoDestinatario ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {destinatarioInfo && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-sm">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100">
                    <User className="h-3.5 w-3.5 text-emerald-700" />
                  </div>
                  <span className="font-medium text-emerald-900">
                    {destinatarioInfo.nombre}
                  </span>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                Motivo
              </Label>
              <Textarea
                placeholder="Motivo de la transferencia..."
                value={motivoTransferencia}
                onChange={(e) => setMotivoTransferencia(e.target.value)}
                className="border-slate-200 focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTransferir(false)}>
              Cancelar
            </Button>
            <Button
              onClick={crearTransferencias}
              disabled={enviandoTransferencia || !destinatarioInfo}
              className="bg-[#0c1f3a] hover:bg-[#0a1a30]"
            >
              {enviandoTransferencia && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enviar{" "}
              {bienesATransferir.length > 1
                ? `${bienesATransferir.length} transferencias`
                : "transferencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================== DIALOG HISTORIAL =================== */}
      <Dialog open={dialogHistorial} onOpenChange={setDialogHistorial}>
        <DialogContent
          className={cn(
            fraunces.variable,
            jetbrains.variable,
            "max-h-[90vh] max-w-lg overflow-y-auto"
          )}
        >
          <DialogHeader>
            <DialogTitle
              className={cn(fraunces.className, "flex items-center gap-2 text-xl")}
            >
              <History className="h-5 w-5 text-[#0c1f3a]" />
              Historial
            </DialogTitle>
            {historialBien && (
              <DialogDescription>
                {historialBien.descripcion} —{" "}
                <span className={cn(jetbrains.className, "text-[#0c1f3a]")}>
                  {historialBien.codigo}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>
          {loadingHistorial ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : historial.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Sin movimientos
            </p>
          ) : (
            <div className="space-y-3">
              {historial.map((h, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3"
                >
                  <div className="mt-0.5 shrink-0">
                    {h.tipo === "TRANSFERENCIA" ? (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-sky-100">
                        <ArrowRightLeft className="h-4 w-4 text-sky-700" />
                      </div>
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {h.tipo}
                      </span>
                      {getEstadoTransfBadge(h.estado)}
                    </div>
                    {h.de && (
                      <p className="mt-1 text-xs text-slate-600">De: {h.de}</p>
                    )}
                    <p className="text-xs text-slate-600">Para: {h.para}</p>
                    {h.motivo && (
                      <p className="mt-1 text-xs text-slate-700">
                        Motivo: {h.motivo}
                      </p>
                    )}
                    <p
                      className={cn(
                        jetbrains.className,
                        "mt-1 text-[10px] text-slate-500"
                      )}
                    >
                      {new Date(h.fecha).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =================== DIALOG RESPONDER TRANSFERENCIA =================== */}
      <Dialog open={dialogResponder} onOpenChange={setDialogResponder}>
        <DialogContent
          className={cn(fraunces.variable, jetbrains.variable, "max-w-md")}
        >
          <DialogHeader>
            <DialogTitle className={cn(fraunces.className, "text-xl")}>
              {accionRespuesta === "aceptar"
                ? "Aceptar transferencia"
                : "Rechazar transferencia"}
            </DialogTitle>
            <DialogDescription>
              {accionRespuesta === "aceptar"
                ? "Al aceptar, el bien pasará a ser tu responsabilidad."
                : "Indica el motivo del rechazo."}
            </DialogDescription>
          </DialogHeader>
          {transferenciaResponder && (
            <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-sm">
              <p>
                <strong className="text-slate-600">Bien:</strong>{" "}
                <span className={cn(jetbrains.className, "text-[#0c1f3a]")}>
                  {transferenciaResponder.codigoPatrimonial}
                </span>
              </p>
              <p>
                <strong className="text-slate-600">De:</strong>{" "}
                {transferenciaResponder.nombreRemitente}
              </p>
              {transferenciaResponder.motivo && (
                <p>
                  <strong className="text-slate-600">Motivo:</strong>{" "}
                  {transferenciaResponder.motivo}
                </p>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
              {accionRespuesta === "aceptar"
                ? "Observaciones (opcional)"
                : "Motivo del rechazo *"}
            </Label>
            <Textarea
              placeholder={
                accionRespuesta === "aceptar"
                  ? "Observaciones..."
                  : "Motivo del rechazo..."
              }
              value={obsRespuesta}
              onChange={(e) => setObsRespuesta(e.target.value)}
              className="border-slate-200 focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogResponder(false)}>
              Cancelar
            </Button>
            <Button
              onClick={responderTransferencia}
              disabled={
                enviandoRespuesta ||
                (accionRespuesta === "rechazar" && !obsRespuesta.trim())
              }
              variant={
                accionRespuesta === "aceptar" ? "default" : "destructive"
              }
              className={
                accionRespuesta === "aceptar"
                  ? "bg-[#0c1f3a] hover:bg-[#0a1a30]"
                  : undefined
              }
            >
              {enviandoRespuesta && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {accionRespuesta === "aceptar" ? "Confirmar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Subcomponentes locales ───
function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 border-slate-200 bg-white pl-9 pr-9 text-sm transition-all focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 p-8 sm:p-12"
      style={{
        animation: "fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <div className="relative flex flex-col items-center text-center">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-slate-100 ring-8 ring-slate-50">
          <Icon className="h-7 w-7 text-slate-500" />
        </div>
        <h3
          className={cn(
            fraunces.className,
            "text-lg text-slate-900 sm:text-xl"
          )}
        >
          {title}
        </h3>
        <p className="mt-2 max-w-md text-sm text-slate-600">{body}</p>
      </div>
    </section>
  )
}

function SkeletonTabla() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="space-y-3 p-5">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-100" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-slate-100"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function Paginacion({
  total,
  pagina,
  setPagina,
  porPag,
  setPorPag,
  label,
}: {
  total: number
  pagina: number
  setPagina: (v: number | ((p: number) => number)) => void
  porPag: number
  setPorPag: (v: number) => void
  label: string
}) {
  const totalPags = Math.max(1, Math.ceil(total / porPag))
  return (
    <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-slate-500">
          Mostrar
        </span>
        <Select
          value={String(porPag)}
          onValueChange={(v) => setPorPag(Number(v))}
        >
          <SelectTrigger className="h-8 w-[70px] border-slate-200 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPCIONES_POR_PAGINA.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className={cn(jetbrains.className, "text-xs text-slate-500")}>
          de {total} {label}
        </span>
      </div>
      {totalPags > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-slate-200"
            disabled={pagina <= 1}
            onClick={() => setPagina((p: number) => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span
            className={cn(
              jetbrains.className,
              "min-w-[60px] px-2 text-center text-sm text-slate-700"
            )}
          >
            {pagina} / {totalPags}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-slate-200"
            disabled={pagina >= totalPags}
            onClick={() => setPagina((p: number) => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
