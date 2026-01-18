"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  Building2,
  CheckCircle,
  ClipboardList,
  Clock,
  Loader2,
  Package,
  Search,
  XCircle,
  AlertTriangle,
  MapPin,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

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

const accesosRapidos = [
  {
    titulo: "Buscar Bien",
    descripcion: "Búsqueda por código o descripción",
    icono: Search,
    href: "/dashboard/patrimonio/buscar",
    color: "bg-blue-500",
  },
  {
    titulo: "Inventario",
    descripcion: "Gestión de sesiones de inventario",
    icono: ClipboardList,
    href: "/dashboard/patrimonio/inventario",
    color: "bg-amber-500",
  },
  {
    titulo: "Etiquetas",
    descripcion: "Generar etiquetas de bienes",
    icono: Archive,
    href: "/dashboard/patrimonio/etiquetas",
    color: "bg-emerald-500",
  },
  {
    titulo: "Reportes",
    descripcion: "Reportes de inventario",
    icono: Building2,
    href: "/dashboard/patrimonio/reportes",
    color: "bg-purple-500",
  },
]

function getEstadoBadgeVariant(estado: string) {
  switch (estado) {
    case "EN_PROCESO":
      return "default"
    case "PENDIENTE":
      return "secondary"
    case "FINALIZADO":
      return "outline"
    default:
      return "default"
  }
}

function getEstadoLabel(estado: string) {
  switch (estado) {
    case "EN_PROCESO":
      return "En Proceso"
    case "PENDIENTE":
      return "Pendiente"
    case "FINALIZADO":
      return "Finalizado"
    default:
      return estado
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

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/dashboard/patrimonio/buscar?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const stats = data?.estadisticas

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Buscador rápido */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código patrimonial o descripción..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        <Button onClick={handleSearch}>
          <Search className="mr-2 size-4" />
          Buscar
        </Button>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sesiones
            </CardTitle>
            <ClipboardList className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSesiones || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sesiones de inventario
              <span className="ml-2 text-amber-600">
                {stats?.sesionesEnProceso || 0} en proceso
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verificaciones
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVerificaciones || 0}</div>
            <p className="text-xs text-muted-foreground">
              Bienes verificados
              <span className="ml-2 text-emerald-600">
                {stats?.porcentajeVerificado || 0}% encontrados
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Encontrados
            </CardTitle>
            <CheckCircle className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats?.verificacionesEncontradas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Bienes en su ubicación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              No Encontrados
            </CardTitle>
            <XCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.verificacionesNoEncontradas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Bienes faltantes
              <span className="ml-2 text-amber-600">
                {stats?.verificacionesReubicadas || 0} reubicados
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de verificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Verificaciones</CardTitle>
          <CardDescription>Estado actual de las verificaciones de bienes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.verificacionesEncontradas || 0}</p>
                <p className="text-sm text-muted-foreground">Encontrados</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.verificacionesNoEncontradas || 0}</p>
                <p className="text-sm text-muted-foreground">No Encontrados</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <MapPin className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.verificacionesReubicadas || 0}</p>
                <p className="text-sm text-muted-foreground">Reubicados</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.verificacionesSobrantes || 0}</p>
                <p className="text-sm text-muted-foreground">Sobrantes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accesos rápidos y Sesiones recientes */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Accesos rápidos */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>Operaciones frecuentes</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {accesosRapidos.map((acceso) => (
              <a
                key={acceso.titulo}
                href={acceso.href}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${acceso.color} text-white`}
                >
                  <acceso.icono className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{acceso.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {acceso.descripcion}
                  </div>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Sesiones recientes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sesiones Recientes</CardTitle>
            <CardDescription>Últimas sesiones de inventario</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.sesionesRecientes && data.sesionesRecientes.length > 0 ? (
              <div className="space-y-4">
                {data.sesionesRecientes.map((sesion) => (
                  <div
                    key={sesion.id}
                    className="flex items-start gap-4 rounded-lg border p-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getEstadoBadgeVariant(sesion.estado)}>
                          {getEstadoLabel(sesion.estado)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(sesion.fecha)}
                        </span>
                      </div>
                      <p className="font-medium">{sesion.nombre}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Código: {sesion.codigo}</span>
                        <span>{sesion.dependencia}</span>
                        <span>Verificados: {sesion.totalVerificados}</span>
                        <span>Por: {sesion.creador}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No hay sesiones de inventario registradas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.push("/dashboard/patrimonio/inventario")}
                >
                  Crear primera sesión
                </Button>
              </div>
            )}
            {data?.sesionesRecientes && data.sesionesRecientes.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/dashboard/patrimonio/inventario")}
                >
                  Ver todas las sesiones
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen por estado de sesiones */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Sesiones</CardTitle>
          <CardDescription>
            Distribución de sesiones de inventario por estado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">En Proceso</span>
                </div>
                <span className="text-2xl font-bold text-amber-600">
                  {stats?.sesionesEnProceso || 0}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-amber-500"
                  style={{
                    width: `${
                      stats?.totalSesiones
                        ? Math.round(((stats.sesionesEnProceso || 0) / stats.totalSesiones) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Pendientes</span>
                </div>
                <span className="text-2xl font-bold text-gray-600">
                  {stats?.sesionesPendientes || 0}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-gray-500"
                  style={{
                    width: `${
                      stats?.totalSesiones
                        ? Math.round(((stats.sesionesPendientes || 0) / stats.totalSesiones) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Finalizadas</span>
                </div>
                <span className="text-2xl font-bold text-emerald-600">
                  {stats?.sesionesFinalizadas || 0}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{
                    width: `${
                      stats?.totalSesiones
                        ? Math.round(((stats.sesionesFinalizadas || 0) / stats.totalSesiones) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependencias con sesiones */}
      {data?.dependenciasResumen && data.dependenciasResumen.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dependencias con Inventario</CardTitle>
            <CardDescription>
              Dependencias con sesiones de inventario activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {data.dependenciasResumen.map((dep) => (
                <div key={dep.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate" title={dep.nombre}>
                      {dep.nombre.length > 25 ? dep.nombre.substring(0, 25) + "..." : dep.nombre}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{dep.sesiones}</span>
                    <span className="text-xs text-muted-foreground">
                      sesión{dep.sesiones !== 1 ? "es" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
