"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Building2,
  ChevronRight,
  Cpu,
  Database,
  HardDrive,
  Loader2,
  MemoryStick,
  RefreshCw,
  Server,
  Settings2,
  Shield,
  Users,
  Activity,
  Bell,
  History,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface UserProfile {
  rol: string
  nombre: string
  apellidos: string
}

interface PermisoModulo {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

interface SystemMetrics {
  memory: {
    total: number
    used: number
    free: number
    percent: number
  }
  disk: {
    total: number
    used: number
    free: number
    percent: number
  }
  cpu: {
    percent: number
    cores: number
    model: string
  }
  system: {
    platform: string
    hostname: string
    uptime: number
    arch: string
  }
  node: {
    version: string
    heapUsed: number
    heapTotal: number
  }
  timestamp: string
}

interface AdminModule {
  title: string
  description: string
  href: string
  icon: React.ElementType
  color: string
  badge?: string
}

const modulosSeguridad: AdminModule[] = [
  {
    title: "Roles y Permisos",
    description: "Configurar accesos por módulo para cada rol",
    href: "/dashboard/admin/roles",
    icon: Shield,
    color: "bg-blue-500",
  },
  {
    title: "Usuarios",
    description: "Gestionar usuarios, roles y estados",
    href: "/dashboard/admin/usuarios",
    icon: Users,
    color: "bg-green-500",
  },
]

const modulosCatalogos: AdminModule[] = [
  {
    title: "Dependencias",
    description: "Administrar unidades orgánicas",
    href: "/dashboard/dependencias",
    icon: Building2,
    color: "bg-purple-500",
  },
  {
    title: "Catálogo de Bienes",
    description: "Gestionar catálogo SBN",
    href: "/dashboard/categorias",
    icon: Database,
    color: "bg-orange-500",
  },
]

const modulosSistema: AdminModule[] = [
  {
    title: "Auditoría",
    description: "Historial de acciones del sistema",
    href: "/dashboard/admin/auditoria",
    icon: History,
    color: "bg-slate-500",
    badge: "Próximamente",
  },
  {
    title: "Reportes del Sistema",
    description: "Estadísticas y métricas generales",
    href: "/dashboard/admin/reportes",
    icon: Activity,
    color: "bg-cyan-500",
    badge: "Próximamente",
  },
]

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days} ${days === 1 ? "día" : "días"}, ${hours} ${hours === 1 ? "hora" : "horas"}, ${minutes} min`
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? "hora" : "horas"}, ${minutes} min`
  } else {
    return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`
  }
}

function getProgressColor(percent: number): string {
  if (percent < 50) return "bg-green-500"
  if (percent < 75) return "bg-yellow-500"
  if (percent < 90) return "bg-orange-500"
  return "bg-red-500"
}

function getStatusColor(percent: number): string {
  if (percent < 50) return "text-green-600"
  if (percent < 75) return "text-yellow-600"
  if (percent < 90) return "text-orange-600"
  return "text-red-600"
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [permisosModulo, setPermisosModulo] = useState<PermisoModulo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mantenimiento, setMantenimiento] = useState(false)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      const response = await fetch("/api/admin/system")
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error al cargar métricas:", error)
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    if (permisosModulo?.ver) {
      fetchMetrics()
      // Actualizar cada 30 segundos
      const interval = setInterval(fetchMetrics, 30000)
      return () => clearInterval(interval)
    }
  }, [permisosModulo, fetchMetrics])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)

        // Obtener permisos del usuario para este módulo
        const permisosResponse = await fetch("/api/auth/permisos")
        if (permisosResponse.ok) {
          const permisosData = await permisosResponse.json()
          const permisoAdmin = permisosData.permisos?.ADMIN_PANEL

          // Admin siempre tiene acceso
          if (data.user.rol === "ADMIN") {
            setPermisosModulo({ ver: true, crear: true, editar: true, eliminar: true, reportes: true })
          } else if (permisoAdmin?.ver) {
            setPermisosModulo(permisoAdmin)
          } else {
            router.push("/dashboard")
          }
        }
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Error al cargar usuario:", error)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!permisosModulo?.ver) {
    return null
  }

  const ModuleCard = ({ module }: { module: AdminModule }) => (
    <Link
      href={module.badge ? "#" : module.href}
      className={`block p-4 rounded-lg border bg-white hover:bg-slate-50 transition-colors group ${
        module.badge ? "opacity-60 cursor-not-allowed" : ""
      }`}
      onClick={(e) => module.badge && e.preventDefault()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${module.color} text-white`}>
            <module.icon className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{module.title}</p>
              {module.badge && (
                <Badge variant="secondary" className="text-xs">
                  {module.badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{module.description}</p>
          </div>
        </div>
        {!module.badge && (
          <ChevronRight className="size-5 text-muted-foreground group-hover:text-[#1e3a5f] transition-colors" />
        )}
      </div>
    </Link>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
          <Settings2 className="size-6" />
          Administración del Sistema
        </h1>
        <p className="text-muted-foreground">
          Panel de control y configuración del sistema SIGA Patrimonio
        </p>
      </div>

      {/* Estado del Sistema - Métricas en tiempo real */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="size-5" />
              Estado del Sistema
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMetrics}
                disabled={metricsLoading}
              >
                <RefreshCw className={`size-4 mr-1 ${metricsLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estado general */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">Sistema Operativo</span>
            {metrics && (
              <span className="text-xs text-green-600 ml-auto">
                Uptime: {formatUptime(metrics.system.uptime)}
              </span>
            )}
          </div>

          {/* Métricas de recursos */}
          {metrics ? (
            <div className="grid md:grid-cols-3 gap-4">
              {/* RAM */}
              <div className="p-4 rounded-lg border bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <MemoryStick className="size-5 text-blue-500" />
                  <span className="font-medium">Memoria RAM</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uso</span>
                    <span className={`font-medium ${getStatusColor(metrics.memory.percent)}`}>
                      {metrics.memory.percent}%
                    </span>
                  </div>
                  <Progress
                    value={metrics.memory.percent}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{metrics.memory.used} GB usados</span>
                    <span>{metrics.memory.total} GB total</span>
                  </div>
                </div>
              </div>

              {/* Disco */}
              <div className="p-4 rounded-lg border bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="size-5 text-purple-500" />
                  <span className="font-medium">Disco Duro</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uso</span>
                    <span className={`font-medium ${getStatusColor(metrics.disk.percent)}`}>
                      {metrics.disk.percent}%
                    </span>
                  </div>
                  <Progress
                    value={metrics.disk.percent}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{metrics.disk.used} GB usados</span>
                    <span>{metrics.disk.total} GB total</span>
                  </div>
                </div>
              </div>

              {/* CPU */}
              <div className="p-4 rounded-lg border bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="size-5 text-orange-500" />
                  <span className="font-medium">Procesador</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Uso</span>
                    <span className={`font-medium ${getStatusColor(metrics.cpu.percent)}`}>
                      {metrics.cpu.percent}%
                    </span>
                  </div>
                  <Progress
                    value={metrics.cpu.percent}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{metrics.cpu.cores} núcleos</span>
                    <span title={metrics.cpu.model}>
                      {metrics.cpu.model.length > 20
                        ? metrics.cpu.model.substring(0, 20) + "..."
                        : metrics.cpu.model}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-lg border bg-slate-50 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
                  <div className="h-2 bg-slate-200 rounded w-full mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-32" />
                </div>
              ))}
            </div>
          )}

          {/* Info adicional */}
          {metrics && (
            <div className="grid md:grid-cols-4 gap-3 pt-2">
              <div className="flex justify-between p-2 rounded bg-slate-100 text-sm">
                <span className="text-muted-foreground">Plataforma</span>
                <span className="font-medium">{metrics.system.platform}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-100 text-sm">
                <span className="text-muted-foreground">Arquitectura</span>
                <span className="font-medium">{metrics.system.arch}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-100 text-sm">
                <span className="text-muted-foreground">Node.js</span>
                <span className="font-medium">{metrics.node.version}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-100 text-sm">
                <span className="text-muted-foreground">Heap Node</span>
                <span className="font-medium">{metrics.node.heapUsed}/{metrics.node.heapTotal} MB</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seguridad y Accesos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Seguridad y Accesos
          </CardTitle>
          <CardDescription>Gestión de usuarios, roles y permisos del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {modulosSeguridad.map((module) => (
              <ModuleCard key={module.title} module={module} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Catálogos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Catálogos del Sistema
          </CardTitle>
          <CardDescription>Administración de catálogos y datos maestros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {modulosCatalogos.map((module) => (
              <ModuleCard key={module.title} module={module} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            Monitoreo y Reportes
          </CardTitle>
          <CardDescription>Auditoría, logs y estadísticas del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {modulosSistema.map((module) => (
              <ModuleCard key={module.title} module={module} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuración Avanzada */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Bell className="size-5" />
            Configuración Avanzada
          </CardTitle>
          <CardDescription>Opciones que afectan a todo el sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-orange-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500 text-white">
                <Server className="size-5" />
              </div>
              <div>
                <Label className="font-medium">Modo Mantenimiento</Label>
                <p className="text-sm text-muted-foreground">
                  Bloquea el acceso a usuarios mientras se realizan actualizaciones
                </p>
              </div>
            </div>
            <Switch
              checked={mantenimiento}
              onCheckedChange={setMantenimiento}
            />
          </div>

          {mantenimiento && (
            <div className="p-4 rounded-lg bg-orange-100 border border-orange-300 text-orange-800 text-sm">
              <strong>Advertencia:</strong> El modo mantenimiento está activado. Solo los administradores pueden acceder al sistema.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
