"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  ClipboardList,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Building2,
  MapPin,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  Package,
  RefreshCw,
  ChevronsUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface Sesion {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  estado: string
  fechaProgramada: string
  fechaInicio: string | null
  fechaFin: string | null
  ubicacionFisica: string | null
  totalBienesSiga: number
  totalVerificados: number
  totalEncontrados: number
  totalReubicados: number
  totalNoEncontrados: number
  totalSobrantes: number
  dependencia: { id: string; nombre: string; siglas: string | null } | null
  sede: { id: string; nombre: string } | null
  responsable: { id: string; nombre: string; apellidos: string }
  _count: {
    verificaciones: number
    participantes: number
    bienesSobrantes: number
  }
}

interface Dependencia {
  id: string
  nombre: string
  siglas: string | null
}

interface Sede {
  id: string
  nombre: string
}

export default function InventarioPage() {
  const router = useRouter()
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>("all")
  const [busqueda, setBusqueda] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dependenciaOpen, setDependenciaOpen] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 10

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    dependenciaId: "",
    sedeId: "",
    ubicacionFisica: "",
    fechaProgramada: "",
  })

  const cargarSesiones = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroEstado !== "all") {
        params.append("estado", filtroEstado)
      }

      const response = await fetch(`/api/inventario/sesiones?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar sesiones")
      }

      setSesiones(data.sesiones)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [filtroEstado])

  const cargarCatalogos = useCallback(async () => {
    try {
      const [depRes, sedeRes] = await Promise.all([
        fetch("/api/dependencias/all"),
        fetch("/api/sedes?limit=100"),
      ])

      const [depData, sedeData] = await Promise.all([
        depRes.json(),
        sedeRes.json(),
      ])

      if (depRes.ok) setDependencias(depData.dependencias || depData)
      if (sedeRes.ok) setSedes(sedeData.sedes || sedeData)
    } catch (err) {
      console.error("Error al cargar catálogos:", err)
    }
  }, [])

  useEffect(() => {
    cargarSesiones()
    cargarCatalogos()
  }, [cargarSesiones, cargarCatalogos])

  const handleCrear = async () => {
    if (!formData.nombre || !formData.fechaProgramada) {
      setError("Nombre y fecha programada son requeridos")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/inventario/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dependenciaId: formData.dependenciaId || null,
          sedeId: formData.sedeId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear sesión")
      }

      setDialogOpen(false)
      setFormData({
        nombre: "",
        descripcion: "",
        dependenciaId: "",
        sedeId: "",
        ubicacionFisica: "",
        fechaProgramada: "",
      })
      cargarSesiones()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear sesión")
    } finally {
      setSaving(false)
    }
  }

  const handleAccion = async (sesionId: string, accion: string) => {
    try {
      const response = await fetch(`/api/inventario/sesiones/${sesionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: accion }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al ejecutar acción")
      }

      cargarSesiones()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ejecutar acción")
    }
  }

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PROGRAMADA: { color: "bg-blue-100 text-blue-800", icon: <Calendar className="h-3 w-3" />, label: "Programada" },
      EN_PROCESO: { color: "bg-green-100 text-green-800", icon: <Play className="h-3 w-3" />, label: "En Proceso" },
      PAUSADA: { color: "bg-yellow-100 text-yellow-800", icon: <Pause className="h-3 w-3" />, label: "Pausada" },
      FINALIZADA: { color: "bg-gray-100 text-gray-800", icon: <CheckCircle className="h-3 w-3" />, label: "Finalizada" },
      CANCELADA: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3 w-3" />, label: "Cancelada" },
    }
    const cfg = config[estado] || config.PROGRAMADA
    return (
      <Badge className={`${cfg.color} gap-1`}>
        {cfg.icon}
        {cfg.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const sesionesFiltradas = sesiones.filter((s) =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.codigo.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPaginaActual(1)
  }, [busqueda, filtroEstado])

  // Cálculos de paginación
  const totalPaginas = Math.ceil(sesionesFiltradas.length / itemsPorPagina)
  const indiceInicio = (paginaActual - 1) * itemsPorPagina
  const indiceFin = indiceInicio + itemsPorPagina
  const sesionesPaginadas = sesionesFiltradas.slice(indiceInicio, indiceFin)

  // Estadísticas generales
  const stats = {
    total: sesiones.length,
    enProceso: sesiones.filter((s) => s.estado === "EN_PROCESO").length,
    programadas: sesiones.filter((s) => s.estado === "PROGRAMADA").length,
    finalizadas: sesiones.filter((s) => s.estado === "FINALIZADA").length,
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Inventario Físico</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona las sesiones de verificación de bienes patrimoniales
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Sesión</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Sesión de Inventario</DialogTitle>
              <DialogDescription>
                Programa una nueva sesión de verificación de bienes
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Inventario Oficina de Logística"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción opcional..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sede">Sede</Label>
                <Select
                  value={formData.sedeId}
                  onValueChange={(value) => setFormData({ ...formData, sedeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sede..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sedes.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dependencia">Dependencia</Label>
                <Popover open={dependenciaOpen} onOpenChange={setDependenciaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={dependenciaOpen}
                      className="justify-between font-normal"
                    >
                      {formData.dependenciaId
                        ? (() => {
                            const dep = dependencias.find((d) => d.id === formData.dependenciaId)
                            return dep
                              ? dep.siglas
                                ? `${dep.siglas} - ${dep.nombre}`
                                : dep.nombre
                              : "Seleccionar dependencia..."
                          })()
                        : "Seleccionar dependencia..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar dependencia..." />
                      <CommandList>
                        <CommandEmpty>No se encontró la dependencia.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {dependencias.map((dep) => (
                            <CommandItem
                              key={dep.id}
                              value={dep.siglas ? `${dep.siglas} ${dep.nombre}` : dep.nombre}
                              onSelect={() => {
                                setFormData({ ...formData, dependenciaId: dep.id })
                                setDependenciaOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.dependenciaId === dep.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="truncate">
                                {dep.siglas ? `${dep.siglas} - ${dep.nombre}` : dep.nombre}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ubicacion">Ubicación Física</Label>
                <Input
                  id="ubicacion"
                  placeholder="Ej: Piso 2, Oficina 201"
                  value={formData.ubicacionFisica}
                  onChange={(e) => setFormData({ ...formData, ubicacionFisica: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha Programada *</Label>
                <Input
                  id="fecha"
                  type="datetime-local"
                  value={formData.fechaProgramada}
                  onChange={(e) => setFormData({ ...formData, fechaProgramada: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCrear} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Sesión
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setError(null)}
              >
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Sesiones</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En Proceso</p>
                <p className="text-xl font-bold">{stats.enProceso}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Programadas</p>
                <p className="text-xl font-bold">{stats.programadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Finalizadas</p>
                <p className="text-xl font-bold">{stats.finalizadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
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
            <SelectItem value="PROGRAMADA">Programada</SelectItem>
            <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
            <SelectItem value="PAUSADA">Pausada</SelectItem>
            <SelectItem value="FINALIZADA">Finalizada</SelectItem>
            <SelectItem value="CANCELADA">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={cargarSesiones}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista de Sesiones */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sesionesFiltradas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 sm:p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No hay sesiones</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {busqueda || filtroEstado !== "all"
                ? "No se encontraron sesiones con los filtros aplicados"
                : "Crea tu primera sesión de inventario para comenzar"}
            </p>
            {!busqueda && filtroEstado === "all" && (
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Sesión
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">
                Sesiones de Inventario ({sesionesFiltradas.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Mostrando {indiceInicio + 1}-{Math.min(indiceFin, sesionesFiltradas.length)} de {sesionesFiltradas.length}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">Dependencia</TableHead>
                    <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden sm:table-cell text-center">Verificados</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sesionesPaginadas.map((sesion) => (
                    <TableRow key={sesion.id}>
                      <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">
                        {sesion.codigo}
                      </TableCell>
                      <TableCell className="max-w-[150px] sm:max-w-[200px]">
                        <div className="truncate font-medium">{sesion.nombre}</div>
                        {sesion.sede && (
                          <div className="text-xs text-muted-foreground truncate">
                            {sesion.sede.nombre}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[150px] truncate">
                        {sesion.dependencia?.siglas || sesion.dependencia?.nombre || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell whitespace-nowrap">
                        {formatDate(sesion.fechaProgramada)}
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(sesion.estado)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-medium">{sesion.totalVerificados}</span>
                          {sesion.totalBienesSiga > 0 && (
                            <span className="text-muted-foreground">/ {sesion.totalBienesSiga}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/patrimonio/inventario/${sesion.id}`)}>
                              <ClipboardList className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>

                            {(sesion.estado === "PROGRAMADA" || sesion.estado === "PAUSADA") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAccion(sesion.id, "iniciar")}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Iniciar
                                </DropdownMenuItem>
                              </>
                            )}

                            {sesion.estado === "EN_PROCESO" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAccion(sesion.id, "pausar")}>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pausar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAccion(sesion.id, "finalizar")}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Finalizar
                                </DropdownMenuItem>
                              </>
                            )}

                            {sesion.estado !== "FINALIZADA" && sesion.estado !== "CANCELADA" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleAccion(sesion.id, "cancelar")}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Controles de paginación */}
            <div className="flex items-center justify-between px-4 py-3 border-t sm:px-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                >
                  <span className="hidden sm:inline mr-1">Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {paginaActual} de {totalPaginas || 1}
                </span>
                {totalPaginas > 1 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
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
                        <Button
                          key={pageNum}
                          variant={paginaActual === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setPaginaActual(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
