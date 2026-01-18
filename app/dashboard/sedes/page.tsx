"use client"

import { useEffect, useState } from "react"
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Phone,
  Mail,
  MoreHorizontal,
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
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface Sede {
  id: string
  codigo: string
  nombre: string
  direccion: string | null
  ciudad: string | null
  telefono: string | null
  email: string | null
  activo: boolean
  _count?: {
    dependencias: number
  }
}

export default function SedesPage() {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSede, setEditingSede] = useState<Sede | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    direccion: "",
    ciudad: "",
    telefono: "",
    email: "",
  })

  useEffect(() => {
    fetchSedes()
  }, [])

  const fetchSedes = async () => {
    try {
      const response = await fetch("/api/sedes")
      if (response.ok) {
        const data = await response.json()
        setSedes(data)
      }
    } catch (error) {
      console.error("Error al cargar sedes:", error)
      toast.error("Error al cargar las sedes")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingSede ? `/api/sedes/${editingSede.id}` : "/api/sedes"
      const method = editingSede ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingSede ? "Sede actualizada" : "Sede creada")
        setDialogOpen(false)
        resetForm()
        fetchSedes()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al guardar")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al guardar la sede")
    }
  }

  const handleEdit = (sede: Sede) => {
    setEditingSede(sede)
    setFormData({
      codigo: sede.codigo,
      nombre: sede.nombre,
      direccion: sede.direccion || "",
      ciudad: sede.ciudad || "",
      telefono: sede.telefono || "",
      email: sede.email || "",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta sede?")) return

    try {
      const response = await fetch(`/api/sedes/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast.success("Sede eliminada")
        fetchSedes()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al eliminar la sede")
    }
  }

  const handleToggleActivo = async (sede: Sede) => {
    try {
      const response = await fetch(`/api/sedes/${sede.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !sede.activo }),
      })

      if (response.ok) {
        toast.success(sede.activo ? "Sede desactivada" : "Sede activada")
        fetchSedes()
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al actualizar estado")
    }
  }

  const resetForm = () => {
    setEditingSede(null)
    setFormData({
      codigo: "",
      nombre: "",
      direccion: "",
      ciudad: "",
      telefono: "",
      email: "",
    })
  }

  const openNewDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  // Paginación
  const totalPages = Math.ceil(sedes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSedes = sedes.slice(startIndex, endIndex)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sedes</h1>
          <p className="text-muted-foreground">
            Gestiona las sedes de la universidad
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Sede
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingSede ? "Editar Sede" : "Nueva Sede"}
                </DialogTitle>
                <DialogDescription>
                  {editingSede
                    ? "Modifica los datos de la sede"
                    : "Ingresa los datos de la nueva sede"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="codigo" className="text-right">
                    Código
                  </Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo: e.target.value })
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="direccion" className="text-right">
                    Dirección
                  </Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) =>
                      setFormData({ ...formData, direccion: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ciudad" className="text-right">
                    Ciudad
                  </Label>
                  <Input
                    id="ciudad"
                    value={formData.ciudad}
                    onChange={(e) =>
                      setFormData({ ...formData, ciudad: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="telefono" className="text-right">
                    Teléfono
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSede ? "Guardar Cambios" : "Crear Sede"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Lista de Sedes
          </CardTitle>
          <CardDescription>
            {sedes.length} sede{sedes.length !== 1 ? "s" : ""} registrada{sedes.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando...</div>
            </div>
          ) : sedes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No hay sedes registradas</h3>
              <p className="text-muted-foreground">
                Comienza creando una nueva sede
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
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Dependencias</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSedes.map((sede) => (
                  <TableRow key={sede.id}>
                    <TableCell className="font-mono">{sede.codigo}</TableCell>
                    <TableCell className="font-medium">{sede.nombre}</TableCell>
                    <TableCell>{sede.ciudad || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {sede.telefono && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {sede.telefono}
                          </span>
                        )}
                        {sede.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {sede.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="flex w-fit items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {sede._count?.dependencias || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={sede.activo}
                        onCheckedChange={() => handleToggleActivo(sede)}
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
                          <DropdownMenuItem onClick={() => handleEdit(sede)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(sede.id)}
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
            {sedes.length > 0 && (
              <div className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Mostrando {startIndex + 1} - {Math.min(endIndex, sedes.length)} de {sedes.length}
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
