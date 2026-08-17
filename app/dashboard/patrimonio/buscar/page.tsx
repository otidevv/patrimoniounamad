"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Fraunces, JetBrains_Mono } from "next/font/google"
import {
  Search,
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
  FileText,
  Truck,
  Tag,
  ChevronLeft,
  ChevronRight,
  IdCard,
  Camera,
  Usb,
  Wifi,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  X,
  Copy,
  Check,
  Keyboard,
  Lightbulb,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// Celda de ficha: etiqueta + valor con icono
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
            "mt-1 text-sm font-medium text-slate-900",
            mono && jetbrains.className,
            "truncate"
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

// Grupo con título editorial
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

export default function BuscarBienPage() {
  const [codigo, setCodigo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [documento, setDocumento] = useState("")
  const [serie, setSerie] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busquedaRealizada, setBusquedaRealizada] = useState<string | null>(null)
  const [bien, setBien] = useState<BienPatrimonial | null>(null)
  const [bienes, setBienes] = useState<BienPatrimonial[]>([])
  const [modoEscaner, setModoEscaner] = useState(false)
  const [modoCamara, setModoCamara] = useState(false)
  const [escanerDetectado, setEscanerDetectado] = useState(false)
  const [bienSeleccionado, setBienSeleccionado] =
    useState<BienPatrimonial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const [personaBusqueda, setPersonaBusqueda] = useState<string | null>(null)
  const [filtroDependencia, setFiltroDependencia] = useState<string>("todas")
  const [activeTab, setActiveTab] = useState<string>("codigo")
  const [copiado, setCopiado] = useState(false)
  const itemsPorPagina = 10
  const inputRef = useRef<HTMLInputElement>(null)
  const descripcionRef = useRef<HTMLInputElement>(null)
  const documentoRef = useRef<HTMLInputElement>(null)
  const serieRef = useRef<HTMLInputElement>(null)
  const lastInputTime = useRef<number>(0)
  const inputBuffer = useRef<string>("")
  const escanerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const requestIdRef = useRef<number>(0)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tabFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialQueryHandledRef = useRef<string | null>(null)
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const buscarPorCodigo = useCallback(async (codigoBuscar: string) => {
    if (!codigoBuscar.trim()) return

    const rid = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setBien(null)
    setBienes([])
    setPersonaBusqueda(null)
    setFiltroDependencia("todas")
    setBusquedaRealizada("codigo")

    try {
      const response = await fetch(
        `/api/patrimonio/buscar?codigo=${encodeURIComponent(codigoBuscar.trim())}`
      )
      const data = await response.json()
      if (rid !== requestIdRef.current) return

      if (!response.ok) {
        setError(data?.error || "Error al buscar")
        return
      }

      setBien(data?.bien ?? null)
    } catch {
      if (rid !== requestIdRef.current) return
      setError("Error de conexión al servidor")
    } finally {
      if (rid === requestIdRef.current) setLoading(false)
    }
  }, [])

  const buscarPorDescripcion = async (q?: string) => {
    const texto = (q ?? descripcion).trim()
    if (!texto) return

    const rid = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setPaginaActual(1)
    setBien(null)
    setBienes([])
    setPersonaBusqueda(null)
    setFiltroDependencia("todas")
    setBusquedaRealizada("descripcion")

    try {
      const response = await fetch(
        `/api/patrimonio/buscar?descripcion=${encodeURIComponent(texto)}`
      )
      const data = await response.json()
      if (rid !== requestIdRef.current) return

      if (!response.ok) {
        setError(data?.error || "Error al buscar")
        return
      }

      setBienes(Array.isArray(data?.bienes) ? data.bienes : [])
    } catch {
      if (rid !== requestIdRef.current) return
      setError("Error de conexión al servidor")
    } finally {
      if (rid === requestIdRef.current) setLoading(false)
    }
  }

  const buscarPorDocumento = async (q?: string) => {
    const texto = (q ?? documento).trim()
    if (!texto) return

    const rid = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setPaginaActual(1)
    setBien(null)
    setBienes([])
    setPersonaBusqueda(null)
    setFiltroDependencia("todas")
    setBusquedaRealizada("documento")

    try {
      const response = await fetch(
        `/api/patrimonio/buscar?documento=${encodeURIComponent(texto)}`
      )
      const data = await response.json()
      if (rid !== requestIdRef.current) return

      if (!response.ok) {
        setError(data?.error || "Error al buscar")
        return
      }

      const lista: BienPatrimonial[] = Array.isArray(data?.bienes) ? data.bienes : []
      setBienes(lista)
      if (lista.length > 0) {
        const primerBien = lista[0]
        setPersonaBusqueda(primerBien.usuario || primerBien.responsable || null)
      }
    } catch {
      if (rid !== requestIdRef.current) return
      setError("Error de conexión al servidor")
    } finally {
      if (rid === requestIdRef.current) setLoading(false)
    }
  }

  const handleDocumentoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarPorDocumento()
  }

  const buscarPorSerie = async (q?: string) => {
    const texto = (q ?? serie).trim()
    if (!texto) return

    const rid = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setPaginaActual(1)
    setBien(null)
    setBienes([])
    setPersonaBusqueda(null)
    setFiltroDependencia("todas")
    setBusquedaRealizada("serie")

    try {
      const response = await fetch(
        `/api/patrimonio/buscar?serie=${encodeURIComponent(texto)}`
      )
      const data = await response.json()
      if (rid !== requestIdRef.current) return

      if (!response.ok) {
        setError(data?.error || "Error al buscar")
        return
      }

      setBienes(Array.isArray(data?.bienes) ? data.bienes : [])
    } catch {
      if (rid !== requestIdRef.current) return
      setError("Error de conexión al servidor")
    } finally {
      if (rid === requestIdRef.current) setLoading(false)
    }
  }

  const handleSerieSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarPorSerie()
  }

  useEffect(() => {
    if (!modoEscaner) return

    // Reset buffer al activar escáner (evita residuos entre sesiones)
    inputBuffer.current = ""
    lastInputTime.current = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      const timeDiff = now - lastInputTime.current

      if (timeDiff < 50 && inputBuffer.current.length > 0) {
        if (!escanerDetectado) {
          setEscanerDetectado(true)
        }
        if (escanerTimeoutRef.current) {
          clearTimeout(escanerTimeoutRef.current)
        }
        escanerTimeoutRef.current = setTimeout(() => {
          setEscanerDetectado(false)
        }, 3000)
      } else if (timeDiff > 200) {
        inputBuffer.current = ""
      }

      if (e.key === "Enter") {
        if (inputBuffer.current.length >= 10) {
          setCodigo(inputBuffer.current)
          buscarPorCodigo(inputBuffer.current)
        }
        inputBuffer.current = ""
        e.preventDefault()
      } else if (e.key.length === 1) {
        inputBuffer.current += e.key
      }

      lastInputTime.current = now
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (escanerTimeoutRef.current) {
        clearTimeout(escanerTimeoutRef.current)
      }
    }
  }, [modoEscaner, buscarPorCodigo, escanerDetectado])

  const handleCameraScan = useCallback(
    (code: string) => {
      setModoCamara(false)
      setCodigo(code)
      buscarPorCodigo(code)
    },
    [buscarPorCodigo]
  )

  useEffect(() => {
    if (modoEscaner && inputRef.current) {
      inputRef.current.focus()
    }
  }, [modoEscaner])

  const handleCodigoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarPorCodigo(codigo)
  }

  const handleDescripcionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    buscarPorDescripcion()
  }

  const refsPorTab: Record<string, React.RefObject<HTMLInputElement | null>> = {
    codigo: inputRef,
    descripcion: descripcionRef,
    documento: documentoRef,
    serie: serieRef,
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (tabFocusTimeoutRef.current) clearTimeout(tabFocusTimeoutRef.current)
    tabFocusTimeoutRef.current = setTimeout(
      () => refsPorTab[value]?.current?.focus(),
      80
    )
  }

  // Atajo "/" para enfocar el input de la pestaña activa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return
      // No disparar con modal, cámara abierta ni escribiendo en otro input
      if (modalOpen || modoCamara) return
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea") return
      e.preventDefault()
      refsPorTab[activeTab]?.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, modalOpen, modoCamara])

  // Limpieza de timeouts pendientes al desmontar
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      if (tabFocusTimeoutRef.current) clearTimeout(tabFocusTimeoutRef.current)
    }
  }, [])

  // Dispara búsqueda automática cuando llega con ?q=<término> (desde el dashboard)
  useEffect(() => {
    const q = searchParams.get("q")?.trim()
    if (!q) return
    if (initialQueryHandledRef.current === q) return
    initialQueryHandledRef.current = q

    const esNumerico = /^\d+$/.test(q)

    if (esNumerico && q.length === 12) {
      setActiveTab("codigo")
      setCodigo(q)
      buscarPorCodigo(q)
    } else if (esNumerico && q.length === 8) {
      setActiveTab("documento")
      setDocumento(q)
      buscarPorDocumento(q)
    } else {
      setActiveTab("descripcion")
      setDescripcion(q)
      buscarPorDescripcion(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const copiarCodigo = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopiado(false), 1500)
    } catch {
      /* clipboard no disponible */
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return null
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value)
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
      {/* =================== HERO =================== */}
      <section
        className="relative overflow-hidden rounded-[28px] border border-slate-900/5 bg-gradient-to-br from-[#081a30] via-[#102b4d] to-[#0c1f3a] shadow-[0_20px_60px_-20px_rgba(12,31,58,0.45)]"
        style={{
          animation: "fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {/* Patrón grilla */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Resplandores */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber-400/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl"
        />
        {/* Código de barras decorativo */}
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

        <div className="relative px-5 py-8 sm:px-8 sm:py-10 md:px-12 md:py-14">
          <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px w-10 bg-amber-300" />
                <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/90 sm:text-xs">
                  Registro Patrimonial · UNAMAD
                </span>
              </div>
              <h1
                className={cn(
                  fraunces.className,
                  "text-[2rem] font-light leading-[1.02] tracking-tight text-white sm:text-5xl md:text-[3.5rem]"
                )}
              >
                Buscar{" "}
                <em className="font-normal italic text-amber-100">bien</em>
                <br className="hidden sm:inline" />{" "}
                <span className="text-slate-300/90">patrimonial.</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
                Consulta el archivo institucional de activos fijos desde el
                sistema SIGA. Código, descripción, serie o persona asignada.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:shrink-0">
              <button
                type="button"
                onClick={() => setModoEscaner(!modoEscaner)}
                aria-pressed={modoEscaner}
                className={cn(
                  "group inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1f3a]",
                  modoEscaner
                    ? "bg-amber-300 text-slate-900 shadow-lg shadow-amber-300/30 hover:bg-amber-200"
                    : "border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:border-white/60"
                )}
              >
                <Usb className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {modoEscaner ? "Escáner USB activo" : "Escáner USB"}
                </span>
                <span className="sm:hidden">USB</span>
                {escanerDetectado && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModoCamara(true)}
                className={cn(
                  "group inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition-all hover:bg-amber-50 hover:shadow-lg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1f3a]",
                  isMobile && "ring-2 ring-amber-300/60 ring-offset-2 ring-offset-[#0c1f3a]"
                )}
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Escanear con cámara</span>
                <span className="sm:hidden">Cámara</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Alerta escáner */}
      {modoEscaner && (
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border px-4 py-3 transition-all sm:px-5 sm:py-4",
            escanerDetectado
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-sky-200 bg-sky-50/70"
          )}
          style={{
            animation: "fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "relative mt-0.5 rounded-full p-2",
                escanerDetectado ? "bg-emerald-100" : "bg-sky-100"
              )}
            >
              <Usb
                className={cn(
                  "h-4 w-4",
                  escanerDetectado ? "text-emerald-700" : "text-sky-700"
                )}
              />
              {escanerDetectado && (
                <Wifi className="absolute -right-0.5 -top-0.5 h-3 w-3 text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  escanerDetectado ? "text-emerald-900" : "text-sky-900"
                )}
              >
                {escanerDetectado
                  ? "Lector USB detectado"
                  : "Modo escáner USB activado"}
                {escanerDetectado && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                )}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  escanerDetectado ? "text-emerald-700" : "text-sky-700"
                )}
              >
                {escanerDetectado
                  ? "Lector de códigos de barras conectado. Escanea para buscar automáticamente."
                  : "Conecta tu lector USB y escanea un código. La búsqueda se ejecutará al instante."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================== BÚSQUEDA =================== */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-1.5 shadow-sm">
          {[
            { value: "codigo", icon: Hash, label: "Código" },
            { value: "descripcion", icon: FileText, label: "Descripción" },
            { value: "documento", icon: IdCard, label: "DNI" },
            { value: "serie", icon: Tag, label: "Serie" },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-sm",
                "data-[state=active]:bg-[#0c1f3a] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-slate-900/15",
                "data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* CÓDIGO */}
        <TabsContent value="codigo" className="mt-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c1f3a] text-amber-200">
                  <Hash className="h-4 w-4" />
                </div>
                <div>
                  <h2
                    className={cn(
                      fraunces.className,
                      "text-lg leading-tight text-slate-900 sm:text-xl"
                    )}
                  >
                    Código patrimonial
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    12 dígitos · identificador único del bien en SIGA
                  </p>
                </div>
              </div>
              <form
                onSubmit={handleCodigoSubmit}
                className="flex flex-col gap-2.5 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Barcode className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Label htmlFor="codigo" className="sr-only">
                    Código Patrimonial
                  </Label>
                  <Input
                    ref={inputRef}
                    id="codigo"
                    placeholder="112236140168"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                    className={cn(
                      jetbrains.className,
                      "h-12 border-slate-200 pl-11 pr-20 text-base tracking-[0.1em] transition-all focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10 sm:h-14 sm:text-lg"
                    )}
                    maxLength={12}
                    autoComplete="off"
                    inputMode="numeric"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    {codigo && (
                      <span
                        className={cn(
                          jetbrains.className,
                          "text-[10px] text-slate-400"
                        )}
                      >
                        {codigo.length}/12
                      </span>
                    )}
                    {codigo && (
                      <button
                        type="button"
                        onClick={() => setCodigo("")}
                        aria-label="Limpiar código"
                        className="pointer-events-auto grid h-6 w-6 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !codigo.trim()}
                  className="group h-12 gap-2 rounded-md bg-[#0c1f3a] px-6 text-sm text-white hover:bg-[#0a1a30] sm:h-14"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Buscar
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* DESCRIPCIÓN */}
        <TabsContent value="descripcion" className="mt-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c1f3a] text-amber-200">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2
                    className={cn(
                      fraunces.className,
                      "text-lg leading-tight text-slate-900 sm:text-xl"
                    )}
                  >
                    Por descripción
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Busca bienes por nombre o descripción parcial
                  </p>
                </div>
              </div>
              <form
                onSubmit={handleDescripcionSubmit}
                className="flex flex-col gap-2.5 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Label htmlFor="descripcion" className="sr-only">
                    Descripción
                  </Label>
                  <Input
                    ref={descripcionRef}
                    id="descripcion"
                    placeholder="escritorio, computadora, silla..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="h-12 border-slate-200 pl-11 pr-10 text-base transition-all focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10 sm:h-14 sm:text-lg"
                  />
                  {descripcion && (
                    <button
                      type="button"
                      onClick={() => setDescripcion("")}
                      aria-label="Limpiar descripción"
                      className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={loading || !descripcion.trim()}
                  className="group h-12 gap-2 rounded-md bg-[#0c1f3a] px-6 text-sm text-white hover:bg-[#0a1a30] sm:h-14"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Buscar
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* DNI */}
        <TabsContent value="documento" className="mt-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c1f3a] text-amber-200">
                  <IdCard className="h-4 w-4" />
                </div>
                <div>
                  <h2
                    className={cn(
                      fraunces.className,
                      "text-lg leading-tight text-slate-900 sm:text-xl"
                    )}
                  >
                    Por documento (DNI)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Consulta los bienes asignados a una persona por su DNI
                  </p>
                </div>
              </div>
              <form
                onSubmit={handleDocumentoSubmit}
                className="flex flex-col gap-2.5 sm:flex-row"
              >
                <div className="relative flex-1">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Label htmlFor="documento" className="sr-only">
                    Número de Documento
                  </Label>
                  <Input
                    ref={documentoRef}
                    id="documento"
                    placeholder="12345678"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ""))}
                    className={cn(
                      jetbrains.className,
                      "h-12 border-slate-200 pl-11 pr-20 text-base tracking-[0.1em] transition-all focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10 sm:h-14 sm:text-lg"
                    )}
                    maxLength={8}
                    autoComplete="off"
                    inputMode="numeric"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    {documento && (
                      <span
                        className={cn(
                          jetbrains.className,
                          "text-[10px] text-slate-400"
                        )}
                      >
                        {documento.length}/8
                      </span>
                    )}
                    {documento && (
                      <button
                        type="button"
                        onClick={() => setDocumento("")}
                        aria-label="Limpiar documento"
                        className="pointer-events-auto grid h-6 w-6 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !documento.trim()}
                  className="group h-12 gap-2 rounded-md bg-[#0c1f3a] px-6 text-sm text-white hover:bg-[#0a1a30] sm:h-14"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Buscar
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* SERIE */}
        <TabsContent value="serie" className="mt-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0c1f3a] text-amber-200">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h2
                    className={cn(
                      fraunces.className,
                      "text-lg leading-tight text-slate-900 sm:text-xl"
                    )}
                  >
                    Por número de serie
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Búsqueda parcial por número de serie del fabricante
                  </p>
                </div>
              </div>
              <form
                onSubmit={handleSerieSubmit}
                className="flex flex-col gap-2.5 sm:flex-row"
              >
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Label htmlFor="serie" className="sr-only">
                    Número de Serie
                  </Label>
                  <Input
                    ref={serieRef}
                    id="serie"
                    placeholder="5CD536B7H5, CMB7G9W792..."
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className={cn(
                      jetbrains.className,
                      "h-12 border-slate-200 pl-11 pr-10 text-base tracking-[0.1em] transition-all focus:border-[#0c1f3a] focus:ring-2 focus:ring-[#0c1f3a]/10 sm:h-14 sm:text-lg"
                    )}
                    autoComplete="off"
                  />
                  {serie && (
                    <button
                      type="button"
                      onClick={() => setSerie("")}
                      aria-label="Limpiar serie"
                      className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={loading || !serie.trim()}
                  className="group h-12 gap-2 rounded-md bg-[#0c1f3a] px-6 text-sm text-white hover:bg-[#0a1a30] sm:h-14"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Buscar
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ERROR */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-rose-100">
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-sm font-medium text-rose-900">{error}</p>
          </div>
        </div>
      )}

      {/* SKELETON DURANTE LA BÚSQUEDA */}
      {loading && !bien && bienes.length === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="h-11 animate-pulse bg-gradient-to-r from-[#0c1f3a]/90 via-[#112b4d]/90 to-[#0c1f3a]/90" />
          <div className="space-y-5 p-5 sm:p-7 md:p-10">
            <div className="space-y-3">
              <div className="h-2.5 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-72 max-w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-slate-100"
                  style={{ animationDelay: `${(i + 3) * 80}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WELCOME + TIPS (solo sin búsqueda previa) */}
      {!loading && !error && !busquedaRealizada && !bien && bienes.length === 0 && (
        <div className="grid gap-3 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/30 p-4 sm:p-5 md:grid-cols-3">
          {[
            {
              icon: Keyboard,
              title: "Atajo rápido",
              body: (
                <>
                  Pulsa{" "}
                  <kbd
                    className={cn(
                      jetbrains.className,
                      "inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-slate-300 bg-white px-1.5 text-[10px] font-semibold text-slate-700 shadow-sm"
                    )}
                  >
                    /
                  </kbd>{" "}
                  para enfocar el campo activo.
                </>
              ),
            },
            {
              icon: Barcode,
              title: "Escáner USB",
              body: "Conecta un lector y escanea el código. La búsqueda se ejecuta sola.",
            },
            {
              icon: Lightbulb,
              title: "Prueba por DNI",
              body: "Consulta todos los bienes asignados a una persona con su documento.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3"
            >
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0c1f3a] text-amber-200">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ARIA-LIVE para lectores de pantalla */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading && "Buscando bien patrimonial"}
        {!loading && bien && `Bien encontrado: ${bien.descripcion}`}
        {!loading && bienes.length > 0 && `${bienes.length} bienes encontrados`}
        {!loading &&
          busquedaRealizada &&
          !bien &&
          bienes.length === 0 &&
          !error &&
          "Sin resultados"}
        {!loading && error && `Error: ${error}`}
      </div>

      {/* =================== RESULTADO ÚNICO (FICHA) =================== */}
      {bien && (
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          style={{
            animation: "fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {/* Top bar ficha */}
          <div className="relative bg-gradient-to-r from-[#0c1f3a] via-[#112b4d] to-[#0c1f3a] px-5 py-3 sm:px-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-amber-200/90 sm:text-xs">
                  Ficha de Registro
                </span>
              </div>
              {bien.codigo_barra && (
                <span
                  className={cn(
                    jetbrains.className,
                    "text-[10px] text-slate-300 sm:text-xs"
                  )}
                >
                  CB · {bien.codigo_barra}
                </span>
              )}
            </div>
            {/* Líneas decorativas código de barras */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 right-6 hidden items-end gap-[2px] opacity-30 sm:flex"
              style={{ height: "60%" }}
            >
              {[3, 5, 2, 6, 4, 3, 7, 2, 5, 4].map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: `${w}px`,
                    height: `${50 + ((i * 7) % 40)}%`,
                  }}
                  className="bg-amber-200/60"
                />
              ))}
            </div>
          </div>

          {/* Encabezado */}
          <div className="px-5 pb-6 pt-7 sm:px-7 sm:pt-9 md:px-10">
            <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                    Código patrimonial
                  </span>
                  <button
                    type="button"
                    onClick={() => copiarCodigo(bien.codigo_patrimonial)}
                    aria-label="Copiar código patrimonial"
                    className={cn(
                      "inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a]/30",
                      copiado
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#0c1f3a] hover:text-[#0c1f3a]"
                    )}
                  >
                    {copiado ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <h2
                  className={cn(
                    jetbrains.className,
                    "text-3xl font-medium tracking-tight text-[#0c1f3a] sm:text-4xl md:text-5xl"
                  )}
                >
                  {bien.codigo_patrimonial}
                </h2>
                <p
                  className={cn(
                    fraunces.className,
                    "max-w-xl text-lg leading-snug text-slate-700 sm:text-xl"
                  )}
                >
                  {bien.descripcion}
                </p>
              </div>
              <div className="relative shrink-0">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 sm:h-20 sm:w-20">
                  <Package className="h-7 w-7 text-[#0c1f3a] sm:h-8 sm:w-8" />
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-300 ring-2 ring-white" />
              </div>
            </div>
          </div>

          <div className="space-y-8 px-5 pb-8 sm:px-7 md:px-10">
            {/* Ubicación */}
            <div>
              <SectionTitle
                eyebrow="I. Localización"
                title="Dónde se encuentra"
                icon={MapPin}
              />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <FichaCell icon={MapPin} label="Sede" value={bien.nombre_sede} />
                <FichaCell
                  icon={Building2}
                  label="Dependencia"
                  value={bien.nombre_depend}
                  sub={bien.abreviatura ? `(${bien.abreviatura})` : undefined}
                />
                <FichaCell
                  icon={Info}
                  label="Ubicación física"
                  value={bien.ubicacion_fisica}
                />
              </div>
            </div>

            {/* Responsables */}
            <div>
              <SectionTitle
                eyebrow="II. Custodia"
                title="Responsables asignados"
                icon={UserCheck}
              />
              <div className="grid gap-2.5 sm:grid-cols-2">
                <FichaCell
                  icon={UserCheck}
                  label="Responsable"
                  value={bien.responsable}
                />
                <FichaCell
                  icon={User}
                  label="Usuario final"
                  value={bien.usuario}
                />
              </div>
            </div>

            {/* Información del Bien */}
            <div>
              <SectionTitle
                eyebrow="III. Identificación"
                title="Información del bien"
                icon={Tag}
              />
              <div className="mb-2.5 rounded-xl border border-slate-200/80 bg-slate-50/40 px-3.5 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Nombre del item
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {bien.nombre_item || "—"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                <FichaCell icon={Tag} label="Marca" value={bien.marca} tone="muted" />
                <FichaCell icon={Tag} label="Modelo" value={bien.modelo} tone="muted" />
                <FichaCell icon={Hash} label="Serie" value={bien.serie} mono tone="muted" />
                <FichaCell icon={Sparkles} label="Color" value={bien.color} tone="muted" />
                <FichaCell icon={Info} label="Medidas" value={bien.medidas} tone="muted" />
              </div>
            </div>

            {bien.caracteristicas && (
              <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-4 py-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Características
                </span>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {bien.caracteristicas}
                </p>
              </div>
            )}

            {/* Adquisición */}
            <div>
              <SectionTitle
                eyebrow="IV. Adquisición"
                title="Historial económico"
                icon={DollarSign}
              />
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <FichaCell icon={Calendar} label="Fecha compra" value={bien.fecha_compra} />
                <FichaCell
                  icon={DollarSign}
                  label="Valor compra"
                  value={formatCurrency(bien.valor_compra)}
                  mono
                />
                <FichaCell icon={Calendar} label="Fecha alta" value={bien.fecha_alta} />
                <FichaCell
                  icon={DollarSign}
                  label="Valor inicial"
                  value={formatCurrency(bien.valor_inicial)}
                  mono
                />
              </div>
            </div>

            {/* Valor neto + Proveedor */}
            <div className="grid gap-3 sm:grid-cols-5">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/60 to-white p-5 sm:col-span-2">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-200/40 blur-2xl"
                />
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-700">
                      Valor neto actual
                    </span>
                  </div>
                  <p
                    className={cn(
                      fraunces.className,
                      "mt-3 text-3xl font-medium leading-none tracking-tight text-emerald-900 sm:text-4xl"
                    )}
                  >
                    {formatCurrency(bien.valor_neto) || "—"}
                  </p>
                  <p className="mt-2 text-xs text-emerald-700/80">
                    Valor actualizado según depreciación SIGA
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 sm:col-span-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                    Proveedor
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {bien.proveedor || "—"}
                  </p>
                  {bien.centro_costo && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Centro de costo:{" "}
                      <span className={jetbrains.className}>
                        {bien.centro_costo}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Observaciones */}
            {bien.observaciones && (
              <div className="relative overflow-hidden rounded-2xl border-l-2 border-[#0c1f3a] bg-slate-50/60 px-5 py-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Observaciones
                </span>
                <p
                  className={cn(
                    fraunces.className,
                    "mt-2 text-sm italic leading-relaxed text-slate-700"
                  )}
                >
                  {bien.observaciones}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =================== RESULTADOS MÚLTIPLES =================== */}
      {bienes.length > 0 &&
        (() => {
          const dependenciasUnicas = Array.from(
            new Set(
              bienes.map(
                (b) => b.abreviatura || b.nombre_depend || "Sin dependencia"
              )
            )
          ).sort()

          const bienesFiltrados =
            filtroDependencia === "todas"
              ? bienes
              : bienes.filter(
                  (b) =>
                    (b.abreviatura ||
                      b.nombre_depend ||
                      "Sin dependencia") === filtroDependencia
                )

          const totalPaginas = Math.ceil(bienesFiltrados.length / itemsPorPagina)
          const indiceInicio = (paginaActual - 1) * itemsPorPagina
          const indiceFin = indiceInicio + itemsPorPagina
          const bienesPaginados = bienesFiltrados.slice(indiceInicio, indiceFin)

          return (
            <section
              className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              style={{
                animation:
                  "fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
              }}
            >
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-col gap-3">
                  {personaBusqueda && (
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                      <User className="h-3 w-3" />
                      <span>
                        Bienes asignados a{" "}
                        <strong className="text-slate-900">
                          {personaBusqueda}
                        </strong>
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                        Resultados del inventario
                      </span>
                      <h3
                        className={cn(
                          fraunces.className,
                          "text-xl leading-tight text-slate-900 sm:text-2xl"
                        )}
                      >
                        <span
                          className={cn(
                            jetbrains.className,
                            "text-[#0c1f3a]"
                          )}
                        >
                          {bienesFiltrados.length}
                        </span>{" "}
                        {bienesFiltrados.length === 1 ? "bien" : "bienes"}
                        {filtroDependencia !== "todas" && (
                          <span className="text-slate-400">
                            {" "}
                            de {bienes.length}
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {dependenciasUnicas.length > 1 && (
                        <Select
                          value={filtroDependencia}
                          onValueChange={(value) => {
                            setFiltroDependencia(value)
                            setPaginaActual(1)
                          }}
                        >
                          <SelectTrigger className="w-[200px] border-slate-200 bg-white sm:w-[250px]">
                            <Building2 className="mr-2 h-4 w-4 text-slate-500" />
                            <SelectValue placeholder="Filtrar por dependencia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">
                              Todas las dependencias
                            </SelectItem>
                            {dependenciasUnicas.map((dep) => (
                              <SelectItem key={dep} value={dep}>
                                {dep}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p
                        className={cn(
                          jetbrains.className,
                          "whitespace-nowrap text-xs text-slate-500"
                        )}
                      >
                        {indiceInicio + 1}–
                        {Math.min(indiceFin, bienesFiltrados.length)} /{" "}
                        {bienesFiltrados.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
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
                        Responsable
                      </TableHead>
                      <TableHead className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:table-cell">
                        Marca
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bienesPaginados.map((item, idx) => (
                      <TableRow
                        key={item.codigo_patrimonial}
                        className="group cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/70"
                        onClick={() => {
                          setBienSeleccionado(item)
                          setModalOpen(true)
                        }}
                        style={{
                          animation: `fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.03}s both`,
                        }}
                      >
                        <TableCell
                          className={cn(
                            jetbrains.className,
                            "whitespace-nowrap text-xs font-medium text-[#0c1f3a] sm:text-sm"
                          )}
                        >
                          {item.codigo_patrimonial}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm sm:max-w-[260px]">
                          {item.descripcion}
                        </TableCell>
                        <TableCell className="hidden max-w-[150px] truncate text-xs text-slate-600 md:table-cell">
                          {item.abreviatura || item.nombre_depend || "—"}
                        </TableCell>
                        <TableCell className="hidden max-w-[150px] truncate text-xs text-slate-600 lg:table-cell">
                          {item.responsable || "—"}
                        </TableCell>
                        <TableCell className="hidden text-xs text-slate-600 sm:table-cell">
                          {item.marca || "—"}
                        </TableCell>
                        <TableCell className="text-right">
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

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaginaActual((p) => Math.max(1, p - 1))
                      }
                      disabled={paginaActual === 1}
                      className="h-8 rounded-full border-slate-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Anterior</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                      }
                      disabled={paginaActual === totalPaginas}
                      className="h-8 rounded-full border-slate-200"
                    >
                      <span className="mr-1 hidden sm:inline">Siguiente</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, totalPaginas) },
                      (_, i) => {
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
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setPaginaActual(pageNum)}
                            aria-label={`Página ${pageNum}`}
                            aria-current={paginaActual === pageNum ? "page" : undefined}
                            className={cn(
                              jetbrains.className,
                              "h-8 w-8 cursor-pointer rounded-full text-xs font-medium transition-all",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a] focus-visible:ring-offset-1",
                              paginaActual === pageNum
                                ? "bg-[#0c1f3a] text-white shadow-md shadow-slate-900/20"
                                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                            )}
                          >
                            {pageNum}
                          </button>
                        )
                      }
                    )}
                  </div>
                </div>
              )}
            </section>
          )
        })()}

      {/* =================== SIN RESULTADOS =================== */}
      {!loading &&
        !error &&
        !bien &&
        bienes.length === 0 &&
        busquedaRealizada && (
          <section
            className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 p-8 sm:p-12"
            style={{
              animation: "fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
            />
            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-100 ring-8 ring-amber-50">
                  <Package className="h-7 w-7 text-amber-700" />
                </div>
                <div className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm ring-1 ring-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                </div>
              </div>
              {busquedaRealizada === "documento" ? (
                <>
                  <h3
                    className={cn(
                      fraunces.className,
                      "text-xl text-amber-950 sm:text-2xl"
                    )}
                  >
                    Sin bienes asignados
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-amber-800/80">
                    El DNI{" "}
                    <span
                      className={cn(
                        jetbrains.className,
                        "font-semibold text-amber-900"
                      )}
                    >
                      {documento}
                    </span>{" "}
                    no tiene bienes patrimoniales registrados en el sistema SIGA.
                  </p>
                </>
              ) : busquedaRealizada === "serie" ? (
                <>
                  <h3
                    className={cn(
                      fraunces.className,
                      "text-xl text-amber-950 sm:text-2xl"
                    )}
                  >
                    Serie no encontrada
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-amber-800/80">
                    No existe ningún bien con el número de serie{" "}
                    <span
                      className={cn(
                        jetbrains.className,
                        "font-semibold text-amber-900"
                      )}
                    >
                      {serie}
                    </span>{" "}
                    en el sistema SIGA.
                  </p>
                </>
              ) : busquedaRealizada === "descripcion" ? (
                <>
                  <h3
                    className={cn(
                      fraunces.className,
                      "text-xl text-amber-950 sm:text-2xl"
                    )}
                  >
                    Sin coincidencias
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-amber-800/80">
                    No se encontraron bienes que coincidan con{" "}
                    <span className="font-semibold italic text-amber-900">
                      &quot;{descripcion}&quot;
                    </span>
                    . Intenta con otros términos.
                  </p>
                </>
              ) : (
                <>
                  <h3
                    className={cn(
                      fraunces.className,
                      "text-xl text-amber-950 sm:text-2xl"
                    )}
                  >
                    Bien no encontrado
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-amber-800/80">
                    El código patrimonial{" "}
                    <span
                      className={cn(
                        jetbrains.className,
                        "font-semibold text-amber-900"
                      )}
                    >
                      {codigo}
                    </span>{" "}
                    no fue encontrado en el sistema SIGA.
                  </p>
                </>
              )}
            </div>
          </section>
        )}

      {/* =================== MODAL DETALLE =================== */}
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
                {/* Descripción */}
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

                {/* Ubicación */}
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

                {/* Responsables */}
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

                {/* Información */}
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
                    <FichaCell icon={Tag} label="Marca" value={bienSeleccionado.marca} tone="muted" />
                    <FichaCell icon={Tag} label="Modelo" value={bienSeleccionado.modelo} tone="muted" />
                    <FichaCell icon={Hash} label="Serie" value={bienSeleccionado.serie} mono tone="muted" />
                    <FichaCell icon={Sparkles} label="Color" value={bienSeleccionado.color} tone="muted" />
                    <FichaCell icon={Info} label="Medidas" value={bienSeleccionado.medidas} tone="muted" />
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

                {/* Adquisición */}
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

                {/* Valor neto + Proveedor */}
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

      {/* Cámara fullscreen */}
      {modoCamara && (
        <BarcodeScanner
          onScan={handleCameraScan}
          onClose={() => setModoCamara(false)}
        />
      )}
    </div>
  )
}
