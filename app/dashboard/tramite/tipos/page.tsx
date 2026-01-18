"use client"

import { useEffect, useState } from "react"
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSignature,
  FileCheck,
  MoreHorizontal,
  Tag,
  ChevronLeft,
  ChevronRight,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface TipoDocumento {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  requiereFirma: boolean
  prefijo: string | null
  activo: boolean
  _count?: {
    documentos: number
  }
}

export default function TiposDocumentoPage() {
  const [tipos, setTipos] = useState<TipoDocumento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumento | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    requiereFirma: true,
    prefijo: "",
    activo: true,
  })

  useEffect(() => {
    fetchTipos()
  }, [])

  const fetchTipos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tramite/tipos-documento?activo=false")
      if (response.ok) {
        const data = await response.json()
        setTipos(data)
      }
    } catch (error) {
      console.error("Error al cargar tipos:", error)
      toast.error("Error al cargar los tipos de documento")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setSelectedTipo(null)
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      requiereFirma: true,
      prefijo: "",
      activo: true,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = (tipo: TipoDocumento) => {
    setSelectedTipo(tipo)
    setFormData({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || "",
      requiereFirma: tipo.requiereFirma,
      prefijo: tipo.prefijo || "",
      activo: tipo.activo,
    })
    setDialogOpen(true)
  }

  const handleOpenDelete = (tipo: TipoDocumento) => {
    setSelectedTipo(tipo)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.codigo || !formData.nombre) {
      toast.error("El código y nombre son requeridos")
      return
    }

    try {
      const url = selectedTipo
        ? `/api/tramite/tipos-documento/${selectedTipo.id}`
        : "/api/tramite/tipos-documento"

      const response = await fetch(url, {
        method: selectedTipo ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(
          selectedTipo
            ? "Tipo de documento actualizado correctamente"
            : "Tipo de documento creado correctamente"
        )
        setDialogOpen(false)
        fetchTipos()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al guardar")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al guardar el tipo de documento")
    }
  }

  const handleDelete = async () => {
    if (!selectedTipo) return

    try {
      const response = await fetch(`/api/tramite/tipos-documento/${selectedTipo.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Tipo de documento eliminado correctamente")
        setDeleteDialogOpen(false)
        fetchTipos()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al eliminar el tipo de documento")
    }
  }

  const filteredTipos = tipos.filter(
    (tipo) =>
      tipo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tipo.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Paginación
  const totalPages = Math.ceil(filteredTipos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTipos = filteredTipos.slice(startIndex, endIndex)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const tiposConFirma = tipos.filter((t) => t.requiereFirma).length
  const tiposSinFirma = tipos.filter((t) => !t.requiereFirma).length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tipos de Documento</h1>
          <p className="text-muted-foreground">
            Administra los tipos de documento para trámite documentario
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Tipo
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tipos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tipos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requieren Firma</CardTitle>
            <FileSignature className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{tiposConFirma}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Firma</CardTitle>
            <FileCheck className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{tiposSinFirma}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Tag className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tipos.filter((t) => t.activo).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Listado de Tipos de Documento
              </CardTitle>
              <CardDescription>
                {filteredTipos.length} tipo{filteredTipos.length !== 1 ? "s" : ""} de documento
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-full sm:w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando...</div>
            </div>
          ) : filteredTipos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No hay tipos de documento</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No se encontraron resultados para la búsqueda"
                  : "Comienza creando un nuevo tipo de documento"}
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
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {tipo.codigo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tipo.nombre}</TableCell>
                    <TableCell>
                      {tipo.prefijo ? (
                        <Badge variant="secondary">{tipo.prefijo}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-muted-foreground">
                        {tipo.descripcion || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tipo.requiereFirma ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          <FileSignature className="mr-1 h-3 w-3" />
                          Requerida
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <FileCheck className="mr-1 h-3 w-3" />
                          Opcional
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          tipo.activo
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {tipo.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(tipo)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenDelete(tipo)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {/* Paginación */}
            {filteredTipos.length > 0 && (
              <div className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredTipos.length)} de {filteredTipos.length}
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

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTipo ? "Editar Tipo de Documento" : "Nuevo Tipo de Documento"}
            </DialogTitle>
            <DialogDescription>
              {selectedTipo
                ? "Modifica los datos del tipo de documento"
                : "Completa los datos para crear un nuevo tipo de documento"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value.toUpperCase() })
                  }
                  placeholder="OF, MEM, INF..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefijo">Prefijo</Label>
                <Input
                  id="prefijo"
                  value={formData.prefijo}
                  onChange={(e) =>
                    setFormData({ ...formData, prefijo: e.target.value.toUpperCase() })
                  }
                  placeholder="OF, MEM..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Oficio, Memorándum, Informe..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Descripción del tipo de documento..."
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requiereFirma">Requiere Firma</Label>
                <p className="text-sm text-muted-foreground">
                  El documento debe tener firma digital o escaneada
                </p>
              </div>
              <Switch
                id="requiereFirma"
                checked={formData.requiereFirma}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiereFirma: checked })
                }
              />
            </div>
            {selectedTipo && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="activo">Activo</Label>
                  <p className="text-sm text-muted-foreground">
                    Disponible para crear nuevos documentos
                  </p>
                </div>
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, activo: checked })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {selectedTipo ? "Guardar Cambios" : "Crear Tipo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Tipo de Documento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el tipo de documento &quot;
              {selectedTipo?.nombre}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
