"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Fraunces, JetBrains_Mono } from "next/font/google"
import {
  Archive,
  Building2,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  Package,
  Search,
  XCircle,
  AlertTriangle,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

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

interface Estadisticas {
  totalSesiones: number
  sesionesEnProceso: number
  sesionesPendientes: number
  sesionesFinalizadas: number
  totalVerificaciones: number
  verificacionesEncontradas: number
  verificacionesNoEncontradas: number
  verificacionesReubicadas: number
  verificacionesSobrantes: number
  totalDependencias: number
  porcentajeVerificado: number
}

interface SesionReciente {
  id: string
  codigo: string
  nombre: string
  estado: string
  totalVerificados: number
  creador: string
  dependencia: string
  fecha: string
}

interface DependenciaResumen {
  id: string
  nombre: string
  sesiones: number
}

interface DashboardData {
  estadisticas: Estadisticas
  sesionesRecientes: SesionReciente[]
  dependenciasResumen: DependenciaResumen[]
}

type AccesoRapido = {
  titulo: string
  descripcion: string
  icono: LucideIcon
  href: string
  eyebrow: string
}

const accesosRapidos: AccesoRapido[] = [
  {
    titulo: "Buscar bien",
    descripcion: "Consulta rápida por código, descripción o DNI.",
    icono: Search,
    href: "/dashboard/patrimonio/buscar",
    eyebrow: "I. Consulta",
  },
  {
    titulo: "Inventario",
    descripcion: "Gestión de sesiones y verificaciones.",
    icono: ClipboardList,
    href: "/dashboard/patrimonio/inventario",
    eyebrow: "II. Control",
  },
  {
    titulo: "Etiquetas",
    descripcion: "Generación de etiquetas para bienes.",
    icono: Archive,
    href: "/dashboard/patrimonio/etiquetas",
    eyebrow: "III. Emisión",
  },
  {
    titulo: "Reportes",
    descripcion: "Reportes consolidados de inventario.",
    icono: Building2,
    href: "/dashboard/patrimonio/reportes",
    eyebrow: "IV. Análisis",
  },
]

function getEstadoLabel(estado: string) {
  switch (estado) {
    case "EN_PROCESO":
      return "En proceso"
    case "PENDIENTE":
      return "Pendiente"
    case "FINALIZADO":
      return "Finalizado"
    default:
      return estado
  }
}

function getEstadoBadgeTone(estado: string) {
  switch (estado) {
    case "EN_PROCESO":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "PENDIENTE":
      return "border-slate-200 bg-slate-100 text-slate-700"
    case "FINALIZADO":
      return "border-emerald-200 bg-emerald-50 text-emerald-800"
    default:
      return "border-slate-200 bg-slate-100 text-slate-700"
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (hours < 1) return "Hace menos de 1 hora"
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`
  if (days < 7) return `Hace ${days} día${days > 1 ? "s" : ""}`
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [saludo, setSaludo] = useState<string>("Buen día")

  useEffect(() => {
    // Saludo según la hora (evita hydration mismatch al setearlo en effect)
    const hour = new Date().getHours()
    if (hour < 12) setSaludo("Buenos días")
    else if (hour < 19) setSaludo("Buenas tardes")
    else setSaludo("Buenas noches")

    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats")
      if (!response.ok) return
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (searchQuery.trim()) {
      router.push(
        `/dashboard/patrimonio/buscar?q=${encodeURIComponent(searchQuery)}`
      )
    }
  }

  // Barras decorativas estilo código de barras
  const barcodePattern = [
    3, 5, 2, 6, 4, 3, 7, 2, 5, 4, 3, 6, 2, 5, 3, 4, 6, 3, 2, 5, 4, 3,
  ]

  const stats = data?.estadisticas

  // Totales para breakdown
  const totalVerif = stats?.totalVerificaciones || 0
  const pctEncontrados = totalVerif
    ? Math.round(((stats?.verificacionesEncontradas || 0) / totalVerif) * 100)
    : 0
  const pctNoEnc = totalVerif
    ? Math.round(
        ((stats?.verificacionesNoEncontradas || 0) / totalVerif) * 100
      )
    : 0
  const pctReub = totalVerif
    ? Math.round(((stats?.verificacionesReubicadas || 0) / totalVerif) * 100)
    : 0
  const pctSobr = totalVerif
    ? Math.round(((stats?.verificacionesSobrantes || 0) / totalVerif) * 100)
    : 0

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col gap-6 p-3 sm:p-5 md:p-6",
        fraunces.variable,
        jetbrains.variable
      )}
    >
      {/* =================== HERO + BÚSQUEDA + STATS =================== */}
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
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px w-10 bg-amber-300" />
              <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/90 sm:text-xs">
                Panel de control · UNAMAD
              </span>
            </div>
            <h1
              className={cn(
                fraunces.className,
                "text-[2rem] font-light leading-[1.02] tracking-tight text-white sm:text-5xl md:text-[3.25rem]"
              )}
            >
              {saludo}.{" "}
              <em className="font-normal italic text-amber-100">Revisa</em>{" "}
              el archivo.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
              Estado actual del inventario patrimonial institucional. Busca un
              bien, revisa sesiones recientes o consulta reportes.
            </p>
          </div>

          {/* Search bar prominent */}
          <form
            onSubmit={handleSearch}
            className="relative mt-7 flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por código patrimonial, descripción o serie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "h-12 border-white/20 bg-white/95 pl-11 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-300/30 sm:h-14 sm:text-lg"
                )}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className={cn(
                "group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-amber-300 px-6 text-sm font-medium text-slate-900 transition-all hover:bg-amber-200 hover:shadow-lg hover:shadow-amber-300/30 sm:h-14",
                "disabled:cursor-not-allowed disabled:opacity-60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1f3a]"
              )}
            >
              <Search className="h-4 w-4" />
              Buscar
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          {/* Stats row en hero */}
          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              [0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))
            ) : (
              <>
                <HeroStat
                  eyebrow="Sesiones"
                  value={stats?.totalSesiones ?? 0}
                  icon={ClipboardList}
                  hint={
                    <>
                      <span className="text-amber-200">
                        {stats?.sesionesEnProceso ?? 0}
                      </span>{" "}
                      en proceso
                    </>
                  }
                />
                <HeroStat
                  eyebrow="Verificaciones"
                  value={stats?.totalVerificaciones ?? 0}
                  icon={Package}
                  hint={
                    <>
                      <span className="text-emerald-200">
                        {stats?.porcentajeVerificado ?? 0}%
                      </span>{" "}
                      encontrados
                    </>
                  }
                />
                <HeroStat
                  eyebrow="Encontrados"
                  value={stats?.verificacionesEncontradas ?? 0}
                  icon={CheckCircle}
                  accent="emerald"
                />
                <HeroStat
                  eyebrow="No encontrados"
                  value={stats?.verificacionesNoEncontradas ?? 0}
                  icon={XCircle}
                  accent="rose"
                  hint={
                    <>
                      <span className="text-amber-200">
                        {stats?.verificacionesReubicadas ?? 0}
                      </span>{" "}
                      reubicados
                    </>
                  }
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* =================== BREAKDOWN VERIFICACIONES =================== */}
      {!loading && totalVerif > 0 && (
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-sm"
          style={{
            animation: "fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="mb-5 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                Resumen de verificaciones
              </span>
              <h3
                className={cn(
                  fraunces.className,
                  "text-lg leading-tight text-slate-900 sm:text-xl"
                )}
              >
                Estado actual del inventario
              </h3>
            </div>
            <span
              className={cn(
                jetbrains.className,
                "text-xs text-slate-500"
              )}
            >
              {totalVerif} registro{totalVerif === 1 ? "" : "s"}
            </span>
          </div>

          {/* Barra de breakdown */}
          <div className="relative mb-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="absolute inset-y-0 left-0 flex h-full">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${pctEncontrados}%` }}
              />
              <div
                className="bg-rose-500 transition-all"
                style={{ width: `${pctNoEnc}%` }}
              />
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${pctReub}%` }}
              />
              <div
                className="bg-sky-400 transition-all"
                style={{ width: `${pctSobr}%` }}
              />
            </div>
          </div>

          {/* 4 status pills */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusPill
              icon={CheckCircle}
              label="Encontrados"
              value={stats?.verificacionesEncontradas ?? 0}
              percent={pctEncontrados}
              tone="emerald"
            />
            <StatusPill
              icon={XCircle}
              label="No encontrados"
              value={stats?.verificacionesNoEncontradas ?? 0}
              percent={pctNoEnc}
              tone="rose"
            />
            <StatusPill
              icon={MapPin}
              label="Reubicados"
              value={stats?.verificacionesReubicadas ?? 0}
              percent={pctReub}
              tone="amber"
            />
            <StatusPill
              icon={AlertTriangle}
              label="Sobrantes"
              value={stats?.verificacionesSobrantes ?? 0}
              percent={pctSobr}
              tone="sky"
            />
          </div>
        </section>
      )}

      {/* =================== ACCESOS RÁPIDOS =================== */}
      <section
        className="relative"
        style={{
          animation: "fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Accesos frecuentes
            </span>
            <h3
              className={cn(
                fraunces.className,
                "text-lg leading-tight text-slate-900 sm:text-xl"
              )}
            >
              Operaciones rápidas
            </h3>
          </div>
          <Sparkles className="h-4 w-4 text-slate-300" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {accesosRapidos.map((acceso, idx) => (
            <Link
              key={acceso.titulo}
              href={acceso.href}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:border-[#0c1f3a]/40 hover:shadow-lg hover:shadow-slate-900/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a] focus-visible:ring-offset-2"
              )}
              style={{
                animation: `fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${
                  idx * 0.05
                }s both`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0c1f3a] text-amber-200 transition-all group-hover:bg-[#0a1a30] group-hover:scale-105">
                  <acceso.icono className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0c1f3a]" />
              </div>
              <div className="mt-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  {acceso.eyebrow}
                </span>
                <h4
                  className={cn(
                    fraunces.className,
                    "mt-1 text-lg leading-tight text-slate-900 transition-colors group-hover:text-[#0c1f3a]"
                  )}
                >
                  {acceso.titulo}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {acceso.descripcion}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* =================== SESIONES + ESTADO =================== */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sesiones recientes */}
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-2"
          style={{
            animation: "fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="flex items-end justify-between border-b border-slate-100 p-5 sm:p-6">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                Actividad reciente
              </span>
              <h3
                className={cn(
                  fraunces.className,
                  "text-lg leading-tight text-slate-900 sm:text-xl"
                )}
              >
                Sesiones de inventario
              </h3>
            </div>
            {data?.sesionesRecientes && data.sesionesRecientes.length > 0 && (
              <Link
                href="/dashboard/patrimonio/inventario"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-all hover:border-[#0c1f3a] hover:text-[#0c1f3a]"
              >
                Ver todas
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="p-5 sm:p-6">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            ) : data?.sesionesRecientes && data.sesionesRecientes.length > 0 ? (
              <ol className="relative space-y-3">
                {data.sesionesRecientes.map((sesion, idx) => (
                  <li
                    key={sesion.id}
                    className="group relative flex gap-4 rounded-xl border border-slate-200/80 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/70"
                    style={{
                      animation: `fadeSlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${
                        idx * 0.04
                      }s both`,
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#0c1f3a] ring-4 ring-slate-100" />
                      {idx < data.sesionesRecientes.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-slate-200" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
                            getEstadoBadgeTone(sesion.estado)
                          )}
                        >
                          {getEstadoLabel(sesion.estado)}
                        </span>
                        <span
                          className={cn(
                            jetbrains.className,
                            "text-[10px] text-slate-500"
                          )}
                        >
                          {formatDate(sesion.fecha)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          fraunces.className,
                          "mt-1.5 truncate text-base text-slate-900"
                        )}
                      >
                        {sesion.nombre}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-slate-400">Código:</span>
                          <span
                            className={cn(
                              jetbrains.className,
                              "text-slate-700"
                            )}
                          >
                            {sesion.codigo}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">
                            {sesion.dependencia}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-slate-400" />
                          <span
                            className={cn(
                              jetbrains.className,
                              "text-slate-700"
                            )}
                          >
                            {sesion.totalVerificados}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-slate-400">Por:</span>
                          <span>{sesion.creador}</span>
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 ring-8 ring-slate-50">
                  <ClipboardList className="h-6 w-6 text-slate-500" />
                </div>
                <h4
                  className={cn(
                    fraunces.className,
                    "text-base text-slate-900"
                  )}
                >
                  Sin sesiones registradas
                </h4>
                <p className="max-w-xs text-xs text-slate-500">
                  Crea la primera sesión de inventario para comenzar el
                  registro.
                </p>
                <Link
                  href="/dashboard/patrimonio/inventario"
                  className={cn(
                    "mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#0c1f3a] px-4 text-xs font-medium text-white transition-all hover:bg-[#0a1a30]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c1f3a] focus-visible:ring-offset-2"
                  )}
                >
                  Crear primera sesión
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Estado de sesiones */}
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          style={{
            animation: "fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
              Distribución
            </span>
            <h3
              className={cn(
                fraunces.className,
                "text-lg leading-tight text-slate-900 sm:text-xl"
              )}
            >
              Estado de sesiones
            </h3>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            {loading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-slate-100"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </>
            ) : (
              <>
                <ProgressBar
                  icon={Clock}
                  label="En proceso"
                  value={stats?.sesionesEnProceso ?? 0}
                  total={stats?.totalSesiones ?? 0}
                  tone="amber"
                />
                <ProgressBar
                  icon={Clock}
                  label="Pendientes"
                  value={stats?.sesionesPendientes ?? 0}
                  total={stats?.totalSesiones ?? 0}
                  tone="slate"
                />
                <ProgressBar
                  icon={CheckCircle}
                  label="Finalizadas"
                  value={stats?.sesionesFinalizadas ?? 0}
                  total={stats?.totalSesiones ?? 0}
                  tone="emerald"
                />
              </>
            )}
          </div>
        </section>
      </div>

      {/* =================== DEPENDENCIAS =================== */}
      {data?.dependenciasResumen && data.dependenciasResumen.length > 0 && (
        <section
          className="relative"
          style={{
            animation: "fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <div className="mb-4 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400">
                Por dependencia
              </span>
              <h3
                className={cn(
                  fraunces.className,
                  "text-lg leading-tight text-slate-900 sm:text-xl"
                )}
              >
                Dependencias con inventario
              </h3>
            </div>
            <span className={cn(jetbrains.className, "text-xs text-slate-500")}>
              {data.dependenciasResumen.length} dependencia
              {data.dependenciasResumen.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.dependenciasResumen.map((dep, idx) => (
              <div
                key={dep.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300"
                style={{
                  animation: `fadeSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${
                    idx * 0.03
                  }s both`,
                }}
                title={dep.nombre}
              >
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="line-clamp-2 text-xs font-medium text-slate-700">
                    {dep.nombre}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      jetbrains.className,
                      "text-2xl font-medium text-[#0c1f3a]"
                    )}
                  >
                    {dep.sesiones}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                    sesión{dep.sesiones !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loader sólo al inicio si no hay nada */}
      {loading && !data && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}
    </div>
  )
}

// ─── Subcomponentes ───

function HeroStat({
  eyebrow,
  value,
  icon: Icon,
  hint,
  accent = "default",
}: {
  eyebrow: string
  value: number
  icon: LucideIcon
  hint?: React.ReactNode
  accent?: "default" | "emerald" | "rose"
}) {
  const accentRing =
    accent === "emerald"
      ? "border-emerald-300/30 bg-emerald-400/10"
      : accent === "rose"
      ? "border-rose-300/30 bg-rose-400/10"
      : "border-white/10 bg-white/5"

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 backdrop-blur-sm transition-all hover:border-white/30",
        accentRing
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-amber-200" />
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200/85">
          {eyebrow}
        </span>
      </div>
      <p
        className={cn(
          jetbrains.className,
          "mt-1.5 text-2xl font-medium text-white sm:text-3xl"
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[10px] text-slate-400">{hint}</p>
      )}
    </div>
  )
}

function StatusPill({
  icon: Icon,
  label,
  value,
  percent,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  percent: number
  tone: "emerald" | "rose" | "amber" | "sky"
}) {
  const tones = {
    emerald: {
      iconBg: "bg-emerald-100 text-emerald-700",
      barBg: "bg-emerald-500",
      label: "text-emerald-900",
    },
    rose: {
      iconBg: "bg-rose-100 text-rose-700",
      barBg: "bg-rose-500",
      label: "text-rose-900",
    },
    amber: {
      iconBg: "bg-amber-100 text-amber-700",
      barBg: "bg-amber-400",
      label: "text-amber-900",
    },
    sky: {
      iconBg: "bg-sky-100 text-sky-700",
      barBg: "bg-sky-500",
      label: "text-sky-900",
    },
  }[tone]

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 px-4 py-3 transition-colors hover:bg-white">
      <div className="flex items-center justify-between">
        <div className={cn("grid h-8 w-8 place-items-center rounded-lg", tones.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <span
          className={cn(
            jetbrains.className,
            "text-[10px] text-slate-400"
          )}
        >
          {percent}%
        </span>
      </div>
      <p
        className={cn(
          jetbrains.className,
          "mt-2 text-2xl font-medium text-slate-900"
        )}
      >
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
    </div>
  )
}

function ProgressBar({
  icon: Icon,
  label,
  value,
  total,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  total: number
  tone: "amber" | "slate" | "emerald"
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  const tones = {
    amber: { text: "text-amber-700", bar: "bg-amber-400" },
    slate: { text: "text-slate-600", bar: "bg-slate-400" },
    emerald: { text: "text-emerald-700", bar: "bg-emerald-500" },
  }[tone]

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5", tones.text)} />
          <span className="text-xs font-medium text-slate-700">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              jetbrains.className,
              "text-lg font-medium text-slate-900"
            )}
          >
            {value}
          </span>
          <span
            className={cn(jetbrains.className, "text-[10px] text-slate-400")}
          >
            {percent}%
          </span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full transition-all", tones.bar)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
