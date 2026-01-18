"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Package,
  MoreHorizontal,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface Sede {
  id: string
  codigo: string
  nombre: string
}

interface Dependencia {
  id: string
  codigo: string
  nombre: string
  siglas: string | null
  tipo: string
  activo: boolean
  sedeId: string
  parentId: string | null
  sede: Sede
  parent: {
    id: string
    codigo: string
    nombre: string
    siglas: string | null
  } | null
  _count?: {
    usuarios: number
    bienes: number
    hijos: number
  }
}

const TIPOS_DEPENDENCIA = [
  { value: "RECTORADO", label: "Rectorado", color: "bg-purple-100 text-purple-800" },
  { value: "VICERRECTORADO", label: "Vicerrectorado", color: "bg-blue-100 text-blue-800" },
  { value: "FACULTAD", label: "Facultad", color: "bg-green-100 text-green-800" },
  { value: "ESCUELA", label: "Escuela", color: "bg-teal-100 text-teal-800" },
  { value: "OFICINA", label: "Oficina", color: "bg-orange-100 text-orange-800" },
  { value: "DIRECCION", label: "Dirección", color: "bg-yellow-100 text-yellow-800" },
  { value: "UNIDAD", label: "Unidad", color: "bg-pink-100 text-pink-800" },
  { value: "OTRO", label: "Otro", color: "bg-gray-100 text-gray-800" },
]

export default function DependenciasPage() {
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDependencia, setEditingDependencia] = useState<Dependencia | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSede, setFilterSede] = useState("todas")
  const [filterTipo, setFilterTipo] = useState("todos")

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    siglas: "",
    tipo: "OFICINA",
    sedeId: "",
    parentId: "",
  })

  useEffect(() => {
    fetchDependencias()
    fetchSedes()
  }, [])

  const fetchDependencias = async () => {
    try {
      const response = await fetch("/api/dependencias/all")
      if (response.ok) {
        const data = await response.json()
        setDependencias(data)
      }
    } catch (error) {
      console.error("Error al cargar dependencias:", error)
      toast.error("Error al cargar las dependencias")
    } finally {
      setLoading(false)
    }
  }

  const fetchSedes = async () => {
    try {
      const response = await fetch("/api/sedes")
      if (response.ok) {
        const data = await response.json()
        setSedes(data)
        // Si solo hay una sede, seleccionarla por defecto
        if (data.length === 1) {
          setFormData(prev => ({ ...prev, sedeId: data[0].id }))
        }
      }
    } catch (error) {
      console.error("Error al cargar sedes:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.sedeId) {
      toast.error("Selecciona una sede")
      return
    }

    try {
      const url = editingDependencia
        ? `/api/dependencias/${editingDependencia.id}`
        : "/api/dependencias/all"
      const method = editingDependencia ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null,
        }),
      })

      if (response.ok) {
        toast.success(editingDependencia ? "Dependencia actualizada" : "Dependencia creada")
        setDialogOpen(false)
        resetForm()
        fetchDependencias()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al guardar")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al guardar la dependencia")
    }
  }

  const handleEdit = (dependencia: Dependencia) => {
    setEditingDependencia(dependencia)
    setFormData({
      codigo: dependencia.codigo,
      nombre: dependencia.nombre,
      siglas: dependencia.siglas || "",
      tipo: dependencia.tipo,
      sedeId: dependencia.sedeId,
      parentId: dependencia.parentId || "",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta dependencia?")) return

    try {
      const response = await fetch(`/api/dependencias/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast.success("Dependencia eliminada")
        fetchDependencias()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al eliminar la dependencia")
    }
  }

  const handleToggleActivo = async (dependencia: Dependencia) => {
    try {
      const response = await fetch(`/api/dependencias/${dependencia.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !dependencia.activo }),
      })

      if (response.ok) {
        toast.success(dependencia.activo ? "Dependencia desactivada" : "Dependencia activada")
        fetchDependencias()
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al actualizar estado")
    }
  }

  const resetForm = () => {
    setEditingDependencia(null)
    setFormData({
      codigo: "",
      nombre: "",
      siglas: "",
      tipo: "OFICINA",
      sedeId: sedes.length === 1 ? sedes[0].id : "",
      parentId: "",
    })
  }

  const openNewDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const getTipoInfo = (tipo: string) => {
    return TIPOS_DEPENDENCIA.find((t) => t.value === tipo) || TIPOS_DEPENDENCIA[7]
  }

  // Filtrar dependencias
  const filteredDependencias = dependencias.filter((dep) => {
    const matchSearch =
      dep.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dep.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dep.siglas?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchSede = filterSede === "todas" || dep.sedeId === filterSede
    const matchTipo = filterTipo === "todos" || dep.tipo === filterTipo

    return matchSearch && matchSede && matchTipo
  })

  // Paginación
  const totalPages = Math.ceil(filteredDependencias.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDependencias = filteredDependencias.slice(startIndex, endIndex)

  // Reset página cuando cambian los filtros
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleSedeChange = (value: string) => {
    setFilterSede(value)
    setCurrentPage(1)
  }

  const handleTipoChange = (value: string) => {
    setFilterTipo(value)
    setCurrentPage(1)
  }

  // Agrupar por tipo para estadísticas
  const statsByTipo = TIPOS_DEPENDENCIA.map((tipo) => ({
    ...tipo,
    count: dependencias.filter((d) => d.tipo === tipo.value).length,
  }))

  return (
    <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dependencias</h1>
          <p className="text-muted-foreground">
            Gestiona las dependencias y unidades orgánicas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Dependencia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingDependencia ? "Editar Dependencia" : "Nueva Dependencia"}
                </DialogTitle>
                <DialogDescription>
                  {editingDependencia
                    ? "Modifica los datos de la dependencia"
                    : "Ingresa los datos de la nueva dependencia"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código *</Label>
                    <Input
                      id="codigo"
                      value={formData.codigo}
                      onChange={(e) =>
                        setFormData({ ...formData, codigo: e.target.value.toUpperCase() })
                      }
                      placeholder="Ej: FING"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siglas">Siglas</Label>
                    <Input
                      id="siglas"
                      value={formData.siglas}
                      onChange={(e) =>
                        setFormData({ ...formData, siglas: e.target.value.toUpperCase() })
                      }
                      placeholder="Ej: FI"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    placeholder="Ej: Facultad de Ingeniería"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DEPENDENCIA.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sede">Sede *</Label>
                  <Select
                    value={formData.sedeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sedeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
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
                <div className="space-y-2">
                  <Label htmlFor="parent">Dependencia Superior (opcional)</Label>
                  <Select
                    value={formData.parentId || "ninguna"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, parentId: value === "ninguna" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguna (nivel superior)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">Ninguna (nivel superior)</SelectItem>
                      {dependencias
                        .filter((d) => d.id !== editingDependencia?.id)
                        .map((dep) => (
                          <SelectItem key={dep.id} value={dep.id}>
                            {dep.siglas || dep.codigo} - {dep.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  {editingDependencia ? "Guardar Cambios" : "Crear Dependencia"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas por tipo */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {statsByTipo.map((tipo) => (
          <Card
            key={tipo.value}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              filterTipo === tipo.value ? "ring-2 ring-primary" : ""
            }`}
            onClick={() =>
              setFilterTipo(filterTipo === tipo.value ? "todos" : tipo.value)
            }
          >
            <CardContent className="p-3">
              <div className="text-2xl font-bold">{tipo.count}</div>
              <div className="text-xs text-muted-foreground truncate">
                {tipo.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de dependencias */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Lista de Dependencias
              </CardTitle>
              <CardDescription>
                {filteredDependencias.length} de {dependencias.length} dependencia{dependencias.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:w-auto">
              <div className="relative col-span-2 sm:col-span-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 w-full sm:w-[180px]"
                />
              </div>
              <Select value={filterSede} onValueChange={handleSedeChange}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sedes</SelectItem>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={handleTipoChange}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {TIPOS_DEPENDENCIA.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando...</div>
            </div>
          ) : filteredDependencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No hay dependencias</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterSede !== "todas" || filterTipo !== "todos"
                  ? "No se encontraron dependencias con los filtros aplicados"
                  : "Comienza creando una nueva dependencia"}
              </p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Dependencia Superior</TableHead>
                  <TableHead>Recursos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDependencias.map((dep) => {
                  const tipoInfo = getTipoInfo(dep.tipo)
                  return (
                    <TableRow key={dep.id}>
                      <TableCell>
                        <div className="font-mono font-medium">{dep.codigo}</div>
                        {dep.siglas && (
                          <div className="text-xs text-muted-foreground">
                            {dep.siglas}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium max-w-[200px] truncate" title={dep.nombre}>
                          {dep.nombre}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={tipoInfo.color}>{tipoInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[100px]" title={dep.sede.nombre}>
                            {dep.sede.codigo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dep.parent ? (
                          <div className="flex items-center gap-1 text-sm">
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span>{dep.parent.siglas || dep.parent.codigo}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {dep._count?.usuarios || 0}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {dep._count?.bienes || 0}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={dep.activo}
                          onCheckedChange={() => handleToggleActivo(dep)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(dep)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(dep.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>

            {/* Paginación */}
            {filteredDependencias.length > 0 && (
              <div className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredDependencias.length)} de {filteredDependencias.length}
                  </span>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>por página</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm">
                    Página {currentPage} de {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
