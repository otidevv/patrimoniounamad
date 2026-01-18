"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Inbox,
  Search,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  ArrowRight,
  MoreHorizontal,
  RefreshCw,
  Send,
  User,
  Loader2,
  ChevronsUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
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
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Documento {
  id: string
  correlativo: string
  anio: number
  asunto: string
  estado: string
  prioridad: string
  fechaDocumento: string
  tipoDocumento: {
    codigo: string
    nombre: string
  }
  dependenciaOrigen: {
    siglas: string
    nombre: string
  }
  remitente: {
    nombre: string
    apellidos: string
  }
  destinos: {
    id: string
    esCopia: boolean
    estadoRecepcion: string
    fechaRecepcion: string | null
  }[]
}

interface Dependencia {
  id: string
  nombre: string
  siglas: string
}

interface Usuario {
  id: string
  nombre: string
  apellidos: string
  cargo: string | null
}

const estadoColors: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  RECIBIDO: "bg-green-100 text-green-800",
  RECHAZADO: "bg-red-100 text-red-800",
}

const prioridadColors: Record<string, string> = {
  BAJA: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  ALTA: "bg-orange-100 text-orange-800",
  URGENTE: "bg-red-100 text-red-800",
}

const estadoIcons: Record<string, typeof Clock> = {
  PENDIENTE: Clock,
  RECIBIDO: CheckCircle,
  RECHAZADO: AlertCircle,
}

export default function BandejaEntradaPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterPrioridad, setFilterPrioridad] = useState("todos")

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal Derivar
  const [derivarModalOpen, setDerivarModalOpen] = useState(false)
  const [derivarDoc, setDerivarDoc] = useState<Documento | null>(null)
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [usuariosDependencia, setUsuariosDependencia] = useState<Usuario[]>([])
  const [derivarForm, setDerivarForm] = useState({
    dependenciaDestinoId: "",
    destinatarioId: "",
    observaciones: "",
  })
  const [derivarLoading, setDerivarLoading] = useState(false)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [dependenciaPopoverOpen, setDependenciaPopoverOpen] = useState(false)

  useEffect(() => {
    fetchDocumentos()
    fetchDependencias()
  }, [])

  const fetchDocumentos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tramite/bandeja/entrada")
      if (response.ok) {
        const data = await response.json()
        setDocumentos(data)
      }
    } catch (error) {
      console.error("Error al cargar documentos:", error)
      toast.error("Error al cargar los documentos")
    } finally {
      setLoading(false)
    }
  }

  const fetchDependencias = async () => {
    try {
      const res = await fetch("/api/dependencias")
      if (res.ok) {
        const data = await res.json()
        setDependencias(data)
      }
    } catch (error) {
      console.error("Error al cargar dependencias:", error)
    }
  }

  const fetchUsuariosDependencia = async (dependenciaId: string) => {
    setLoadingUsuarios(true)
    try {
      const res = await fetch(`/api/tramite/usuarios-dependencia?dependenciaId=${dependenciaId}`)
      if (res.ok) {
        const data = await res.json()
        setUsuariosDependencia(data)
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const openDerivarModal = (doc: Documento) => {
    setDerivarDoc(doc)
    setDerivarForm({
      dependenciaDestinoId: "",
      destinatarioId: "",
      observaciones: "",
    })
    setUsuariosDependencia([])
    setDependenciaPopoverOpen(false)
    setDerivarModalOpen(true)
  }

  const handleDependenciaChange = (dependenciaId: string) => {
    setDerivarForm(prev => ({
      ...prev,
      dependenciaDestinoId: dependenciaId,
      destinatarioId: "",
    }))
    if (dependenciaId) {
      fetchUsuariosDependencia(dependenciaId)
    } else {
      setUsuariosDependencia([])
    }
  }

  const handleDerivar = async () => {
    if (!derivarDoc) return

    if (!derivarForm.dependenciaDestinoId) {
      toast.error("Debe seleccionar una dependencia destino")
      return
    }

    if (!derivarForm.destinatarioId) {
      toast.error("Debe seleccionar un destinatario")
      return
    }

    setDerivarLoading(true)

    try {
      const res = await fetch("/api/tramite/derivar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentoId: derivarDoc.id,
          dependenciaDestinoId: derivarForm.dependenciaDestinoId,
          destinatarioId: derivarForm.destinatarioId,
          observaciones: derivarForm.observaciones,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Documento derivado correctamente")
        setDerivarModalOpen(false)
        fetchDocumentos()
      } else {
        toast.error(data.message || "Error al derivar el documento")
      }
    } catch {
      toast.error("Error de conexión al derivar el documento")
    } finally {
      setDerivarLoading(false)
    }
  }

  const handleRecibir = async (documentoId: string, destinoId: string) => {
    try {
      const response = await fetch(`/api/tramite/recibir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentoId, destinoId }),
      })

      if (response.ok) {
        toast.success("Documento recibido correctamente")
        fetchDocumentos()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al recibir documento")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al recibir el documento")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const filteredDocumentos = documentos.filter((doc) => {
    const matchSearch =
      doc.correlativo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.asunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.dependenciaOrigen.nombre.toLowerCase().includes(searchTerm.toLowerCase())

    const matchEstado =
      filterEstado === "todos" ||
      doc.destinos[0]?.estadoRecepcion === filterEstado

    const matchPrioridad =
      filterPrioridad === "todos" || doc.prioridad === filterPrioridad

    return matchSearch && matchEstado && matchPrioridad
  })

  // Paginación
  const totalPages = Math.ceil(filteredDocumentos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDocumentos = filteredDocumentos.slice(startIndex, endIndex)

  // Resetear a página 1 cuando cambian los filtros
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  const pendientes = documentos.filter(
    (d) => d.destinos[0]?.estadoRecepcion === "PENDIENTE"
  ).length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bandeja de Entrada</h1>
          <p className="text-muted-foreground">
            Documentos recibidos en tu dependencia
          </p>
        </div>
        <Button onClick={fetchDocumentos} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recibidos</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recibidos Hoy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {documentos.filter((d) => {
                const today = new Date().toDateString()
                return d.destinos[0]?.fechaRecepcion &&
                  new Date(d.destinos[0].fechaRecepcion).toDateString() === today
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {documentos.filter((d) => d.prioridad === "URGENTE").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Documentos Recibidos
              </CardTitle>
              <CardDescription>
                {filteredDocumentos.length} documento{filteredDocumentos.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select value={filterEstado} onValueChange={(v) => handleFilterChange(setFilterEstado, v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="RECIBIDO">Recibido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPrioridad} onValueChange={(v) => handleFilterChange(setFilterPrioridad, v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="BAJA">Baja</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando...</div>
            </div>
          ) : filteredDocumentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No hay documentos</h3>
              <p className="text-muted-foreground">
                No tienes documentos en tu bandeja de entrada
              </p>
            </div>
          ) : (
            <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocumentos.map((doc) => {
                  const EstadoIcon = estadoIcons[doc.destinos[0]?.estadoRecepcion] || Clock
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {doc.tipoDocumento.codigo}-{doc.correlativo}-{doc.anio}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {doc.tipoDocumento.nombre}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px] truncate" title={doc.asunto}>
                          {doc.asunto}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{doc.dependenciaOrigen.siglas}</div>
                            <div className="text-xs text-muted-foreground">
                              {doc.remitente.nombre} {doc.remitente.apellidos}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.fechaDocumento)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={prioridadColors[doc.prioridad]}>
                          {doc.prioridad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoColors[doc.destinos[0]?.estadoRecepcion] || ""}>
                          <EstadoIcon className="mr-1 h-3 w-3" />
                          {doc.destinos[0]?.estadoRecepcion}
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
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/tramite/documento/${doc.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Documento
                              </Link>
                            </DropdownMenuItem>
                            {doc.destinos[0]?.estadoRecepcion === "PENDIENTE" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRecibir(doc.id, doc.destinos[0]?.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Recibir Documento
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => openDerivarModal(doc)}>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Derivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrar</span>
                <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>de {filteredDocumentos.length} registros</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Derivar */}
      <Dialog open={derivarModalOpen} onOpenChange={setDerivarModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Derivar Documento
            </DialogTitle>
            <DialogDescription>
              {derivarDoc && (
                <span>
                  {derivarDoc.tipoDocumento.codigo}-{derivarDoc.correlativo}-{derivarDoc.anio}: {derivarDoc.asunto}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dependencia" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Dependencia Destino *
              </Label>
              <Popover open={dependenciaPopoverOpen} onOpenChange={setDependenciaPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={dependenciaPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {derivarForm.dependenciaDestinoId
                      ? (() => {
                          const dep = dependencias.find(d => d.id === derivarForm.dependenciaDestinoId)
                          return dep ? `${dep.siglas} - ${dep.nombre}` : "Seleccione una dependencia"
                        })()
                      : "Seleccione una dependencia"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar dependencia..." />
                    <CommandList>
                      <CommandEmpty>No se encontró la dependencia.</CommandEmpty>
                      <CommandGroup>
                        {dependencias.map((dep) => (
                          <CommandItem
                            key={dep.id}
                            value={`${dep.siglas} ${dep.nombre}`}
                            onSelect={() => {
                              handleDependenciaChange(dep.id)
                              setDependenciaPopoverOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                derivarForm.dependenciaDestinoId === dep.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="font-medium">{dep.siglas}</span>
                            <span className="ml-2 text-muted-foreground">{dep.nombre}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinatario" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Destinatario *
              </Label>
              <Select
                value={derivarForm.destinatarioId}
                onValueChange={(value) =>
                  setDerivarForm(prev => ({ ...prev, destinatarioId: value }))
                }
                disabled={!derivarForm.dependenciaDestinoId || loadingUsuarios}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !derivarForm.dependenciaDestinoId
                      ? "Seleccione primero una dependencia"
                      : loadingUsuarios
                      ? "Cargando usuarios..."
                      : usuariosDependencia.length === 0
                      ? "No hay usuarios en esta dependencia"
                      : "Seleccione un destinatario"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {usuariosDependencia.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nombre} {user.apellidos}
                      {user.cargo && ` - ${user.cargo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={derivarForm.observaciones}
                onChange={(e) =>
                  setDerivarForm(prev => ({ ...prev, observaciones: e.target.value }))
                }
                placeholder="Agregue observaciones o instrucciones..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDerivarModalOpen(false)}
              disabled={derivarLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDerivar}
              disabled={derivarLoading || !derivarForm.dependenciaDestinoId || !derivarForm.destinatarioId}
            >
              {derivarLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Derivando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Derivar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
