"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Send,
  Search,
  Eye,
  CheckCircle,
  Clock,
  FileText,
  Building2,
  Calendar,
  MoreHorizontal,
  RefreshCw,
  XCircle,
  Plus,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Documento {
  id: string
  correlativo: string
  anio: number
  asunto: string
  estado: string
  prioridad: string
  fechaDocumento: string
  fechaEnvio: string | null
  tipoDocumento: {
    codigo: string
    nombre: string
  }
  destinos: {
    dependenciaDestino: {
      siglas: string
      nombre: string
    }
    esCopia: boolean
    estadoRecepcion: string
    fechaRecepcion: string | null
  }[]
}

const estadoDocColors: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  RECIBIDO: "bg-green-100 text-green-800",
  DERIVADO: "bg-purple-100 text-purple-800",
  ATENDIDO: "bg-teal-100 text-teal-800",
  ARCHIVADO: "bg-slate-100 text-slate-800",
}

const prioridadColors: Record<string, string> = {
  BAJA: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  ALTA: "bg-orange-100 text-orange-800",
  URGENTE: "bg-red-100 text-red-800",
}

export default function BandejaSalidaPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchDocumentos()
  }, [])

  const fetchDocumentos = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tramite/bandeja/salida")
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getDestinatarios = (destinos: Documento["destinos"]) => {
    const principales = destinos.filter((d) => !d.esCopia)
    const copias = destinos.filter((d) => d.esCopia)

    return {
      principales: principales.map((d) => d.dependenciaDestino.siglas).join(", "),
      copias: copias.map((d) => d.dependenciaDestino.siglas).join(", "),
      todosRecibidos: destinos.every((d) => d.estadoRecepcion === "RECIBIDO"),
      algunoPendiente: destinos.some((d) => d.estadoRecepcion === "PENDIENTE"),
    }
  }

  const filteredDocumentos = documentos.filter((doc) => {
    const matchSearch =
      doc.correlativo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.asunto.toLowerCase().includes(searchTerm.toLowerCase())

    const matchEstado = filterEstado === "todos" || doc.estado === filterEstado

    return matchSearch && matchEstado
  })

  // Paginación
  const totalPages = Math.ceil(filteredDocumentos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDocumentos = filteredDocumentos.slice(startIndex, endIndex)

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1)
  }

  const enviados = documentos.filter((d) => d.estado !== "BORRADOR").length
  const borradores = documentos.filter((d) => d.estado === "BORRADOR").length

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bandeja de Salida</h1>
          <p className="text-muted-foreground">
            Documentos enviados desde tu dependencia
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDocumentos} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link href="/dashboard/tramite/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Documento
            </Link>
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{borradores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{enviados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Recepción</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {documentos.filter((d) =>
                d.destinos.some((dest) => dest.estadoRecepcion === "PENDIENTE")
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de documentos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Documentos Enviados
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
              <Select value={filterEstado} onValueChange={(v) => {
                setFilterEstado(v)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="ENVIADO">Enviado</SelectItem>
                  <SelectItem value="RECIBIDO">Recibido</SelectItem>
                  <SelectItem value="ATENDIDO">Atendido</SelectItem>
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
              <Send className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No hay documentos</h3>
              <p className="text-muted-foreground">
                No has enviado ningún documento aún
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/tramite/nuevo">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Documento
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Fecha Envío</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Recepción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDocumentos.map((doc) => {
                  const destinatarios = getDestinatarios(doc.destinos)
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
                        <div className="max-w-[200px] truncate" title={doc.asunto}>
                          {doc.asunto}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{destinatarios.principales || "-"}</span>
                          </div>
                          {destinatarios.copias && (
                            <div className="text-xs text-muted-foreground">
                              CC: {destinatarios.copias}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.fechaEnvio)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={prioridadColors[doc.prioridad]}>
                          {doc.prioridad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoDocColors[doc.estado]}>
                          {doc.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.estado === "BORRADOR" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : destinatarios.todosRecibidos ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Recibido
                          </Badge>
                        ) : destinatarios.algunoPendiente ? (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="mr-1 h-3 w-3" />
                            Pendiente
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="mr-1 h-3 w-3" />
                            Rechazado
                          </Badge>
                        )}
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
                            {doc.estado === "BORRADOR" && (
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/tramite/editar/${doc.id}`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                            )}
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
    </div>
  )
}
