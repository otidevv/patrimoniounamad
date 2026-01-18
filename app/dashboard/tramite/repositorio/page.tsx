"use client"

import { useEffect, useState, useCallback } from "react"
import {
  FolderPlus,
  Upload,
  Search,
  Folder,
  FolderOpen,
  FileText,
  MoreHorizontal,
  Trash2,
  Edit2,
  Move,
  Eye,
  Download,
  RefreshCw,
  ChevronRight,
  Home,
  Shield,
  Loader2,
  File,
  CheckCircle,
  X,
  PenTool,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Carpeta {
  id: string
  nombre: string
  descripcion: string | null
  color: string | null
  parentId: string | null
  _count: {
    hijos: number
    archivos: number
  }
  children?: Carpeta[]
}

interface Archivo {
  id: string
  nombre: string
  nombreArchivo: string
  url: string
  tamanio: number
  firmado: boolean
  fechaFirma: string | null
  carpetaId: string | null
  createdAt: string
  carpeta?: {
    id: string
    nombre: string
  } | null
  _count?: {
    usosEnTramites: number
  }
}

const coloresDisponibles = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Amarillo" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#8b5cf6", label: "Morado" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6b7280", label: "Gris" },
]

export default function RepositorioPage() {
  const [carpetas, setCarpetas] = useState<Carpeta[]>([])
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [carpetasPlanas, setCarpetasPlanas] = useState<Carpeta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Navegación
  const [carpetaActual, setCarpetaActual] = useState<string | null>(null)
  const [rutaNavegacion, setRutaNavegacion] = useState<{ id: string | null; nombre: string }[]>([
    { id: null, nombre: "Mi Repositorio" },
  ])

  // Estados de modales
  const [crearCarpetaOpen, setCrearCarpetaOpen] = useState(false)
  const [editarCarpetaOpen, setEditarCarpetaOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editarArchivoOpen, setEditarArchivoOpen] = useState(false)
  const [moverArchivoOpen, setMoverArchivoOpen] = useState(false)
  const [confirmarEliminarOpen, setConfirmarEliminarOpen] = useState(false)

  // Estados de formularios
  const [carpetaForm, setCarpetaForm] = useState({
    nombre: "",
    descripcion: "",
    color: "",
  })
  const [archivoForm, setArchivoForm] = useState({
    nombre: "",
  })
  const [moverForm, setMoverForm] = useState({
    carpetaId: "",
  })

  // Estados de selección
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<Carpeta | null>(null)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<Archivo | null>(null)
  const [itemEliminar, setItemEliminar] = useState<{ tipo: "carpeta" | "archivo"; item: Carpeta | Archivo } | null>(null)

  // Estados de carga
  const [uploadLoading, setUploadLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Archivos para subir
  const [archivosSubir, setArchivosSubir] = useState<File[]>([])
  const [nombreArchivoSubir, setNombreArchivoSubir] = useState("")

  // Carpetas expandidas
  const [carpetasExpandidas, setCarpetasExpandidas] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/repositorio/selector")
      if (response.ok) {
        const data = await response.json()
        setCarpetas(data.carpetas)
        setCarpetasPlanas(data.carpetasPlanas)
        setArchivos(data.archivos)
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar el repositorio")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Construir ruta de navegación
  const construirRuta = (carpetaId: string | null) => {
    const ruta: { id: string | null; nombre: string }[] = [{ id: null, nombre: "Mi Repositorio" }]

    if (carpetaId) {
      const encontrarRuta = (id: string): { id: string; nombre: string }[] => {
        const carpeta = carpetasPlanas.find((c) => c.id === id)
        if (!carpeta) return []

        if (carpeta.parentId) {
          return [...encontrarRuta(carpeta.parentId), { id: carpeta.id, nombre: carpeta.nombre }]
        }
        return [{ id: carpeta.id, nombre: carpeta.nombre }]
      }

      ruta.push(...encontrarRuta(carpetaId))
    }

    return ruta
  }

  const navegarACarpeta = (carpetaId: string | null) => {
    setCarpetaActual(carpetaId)
    setRutaNavegacion(construirRuta(carpetaId))
    setSearchTerm("")
  }

  // Archivos de la carpeta actual
  const archivosActuales = archivos.filter((a) => {
    if (searchTerm) {
      return a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.nombreArchivo.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return a.carpetaId === carpetaActual
  })

  // Subcarpetas de la carpeta actual
  const subcarpetasActuales = carpetasPlanas.filter((c) => c.parentId === carpetaActual)

  // Crear carpeta
  const handleCrearCarpeta = async () => {
    if (!carpetaForm.nombre.trim()) {
      toast.error("El nombre de la carpeta es requerido")
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch("/api/repositorio/carpetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: carpetaForm.nombre,
          descripcion: carpetaForm.descripcion || null,
          color: carpetaForm.color || null,
          parentId: carpetaActual,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Carpeta creada correctamente")
        setCrearCarpetaOpen(false)
        setCarpetaForm({ nombre: "", descripcion: "", color: "" })
        fetchData()
      } else {
        toast.error(data.error || "Error al crear la carpeta")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setActionLoading(false)
    }
  }

  // Editar carpeta
  const handleEditarCarpeta = async () => {
    if (!carpetaSeleccionada || !carpetaForm.nombre.trim()) {
      toast.error("El nombre de la carpeta es requerido")
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/repositorio/carpetas/${carpetaSeleccionada.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: carpetaForm.nombre,
          descripcion: carpetaForm.descripcion || null,
          color: carpetaForm.color || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Carpeta actualizada correctamente")
        setEditarCarpetaOpen(false)
        setCarpetaSeleccionada(null)
        setCarpetaForm({ nombre: "", descripcion: "", color: "" })
        fetchData()
      } else {
        toast.error(data.error || "Error al actualizar la carpeta")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setActionLoading(false)
    }
  }

  // Subir archivo
  const handleSubirArchivo = async () => {
    if (archivosSubir.length === 0) {
      toast.error("Selecciona al menos un archivo")
      return
    }

    setUploadLoading(true)
    try {
      for (const file of archivosSubir) {
        const formData = new FormData()
        formData.append("archivo", file)
        formData.append("nombre", nombreArchivoSubir || file.name.replace(".pdf", ""))
        if (carpetaActual) {
          formData.append("carpetaId", carpetaActual)
        }

        const response = await fetch("/api/repositorio/upload", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error || `Error al subir ${file.name}`)
          continue
        }
      }

      toast.success(archivosSubir.length === 1 ? "Archivo subido correctamente" : "Archivos subidos correctamente")
      setUploadOpen(false)
      setArchivosSubir([])
      setNombreArchivoSubir("")
      fetchData()
    } catch {
      toast.error("Error de conexión")
    } finally {
      setUploadLoading(false)
    }
  }

  // Editar archivo
  const handleEditarArchivo = async () => {
    if (!archivoSeleccionado) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/repositorio/archivos/${archivoSeleccionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: archivoForm.nombre,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Archivo actualizado correctamente")
        setEditarArchivoOpen(false)
        setArchivoSeleccionado(null)
        setArchivoForm({ nombre: "" })
        fetchData()
      } else {
        toast.error(data.error || "Error al actualizar el archivo")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setActionLoading(false)
    }
  }

  // Mover archivo
  const handleMoverArchivo = async () => {
    if (!archivoSeleccionado) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/repositorio/archivos/${archivoSeleccionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carpetaId: moverForm.carpetaId === "raiz" ? null : moverForm.carpetaId || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Archivo movido correctamente")
        setMoverArchivoOpen(false)
        setArchivoSeleccionado(null)
        setMoverForm({ carpetaId: "" })
        fetchData()
      } else {
        toast.error(data.error || "Error al mover el archivo")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setActionLoading(false)
    }
  }

  // Eliminar
  const handleEliminar = async () => {
    if (!itemEliminar) return

    setActionLoading(true)
    try {
      const endpoint = itemEliminar.tipo === "carpeta"
        ? `/api/repositorio/carpetas/${itemEliminar.item.id}`
        : `/api/repositorio/archivos/${itemEliminar.item.id}`

      const response = await fetch(endpoint, { method: "DELETE" })
      const data = await response.json()

      if (response.ok) {
        toast.success(`${itemEliminar.tipo === "carpeta" ? "Carpeta" : "Archivo"} eliminado correctamente`)
        if (data.advertencia) {
          toast.warning(data.advertencia)
        }
        setConfirmarEliminarOpen(false)
        setItemEliminar(null)
        fetchData()
      } else {
        toast.error(data.error || "Error al eliminar")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setActionLoading(false)
    }
  }

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Abrir editar carpeta
  const abrirEditarCarpeta = (carpeta: Carpeta) => {
    setCarpetaSeleccionada(carpeta)
    setCarpetaForm({
      nombre: carpeta.nombre,
      descripcion: carpeta.descripcion || "",
      color: carpeta.color || "",
    })
    setEditarCarpetaOpen(true)
  }

  // Abrir editar archivo
  const abrirEditarArchivo = (archivo: Archivo) => {
    setArchivoSeleccionado(archivo)
    setArchivoForm({
      nombre: archivo.nombre,
    })
    setEditarArchivoOpen(true)
  }

  // Abrir mover archivo
  const abrirMoverArchivo = (archivo: Archivo) => {
    setArchivoSeleccionado(archivo)
    setMoverForm({
      carpetaId: archivo.carpetaId || "raiz",
    })
    setMoverArchivoOpen(true)
  }

  // Expandir/contraer carpeta en el árbol
  const toggleCarpetaExpandida = (id: string) => {
    setCarpetasExpandidas((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Renderizar árbol de carpetas
  const renderArbolCarpetas = (carpetas: Carpeta[], nivel = 0) => {
    return carpetas.map((carpeta) => (
      <div key={carpeta.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => navegarACarpeta(carpeta.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              navegarACarpeta(carpeta.id)
            }
          }}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent cursor-pointer",
            carpetaActual === carpeta.id && "bg-accent font-medium"
          )}
          style={{ paddingLeft: `${8 + nivel * 16}px` }}
        >
          {carpeta._count.hijos > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                toggleCarpetaExpandida(carpeta.id)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleCarpetaExpandida(carpeta.id)
                }
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  carpetasExpandidas.has(carpeta.id) && "rotate-90"
                )}
              />
            </span>
          )}
          {carpeta._count.hijos === 0 && <div className="w-4" />}
          {carpetasExpandidas.has(carpeta.id) || carpetaActual === carpeta.id ? (
            <FolderOpen className="h-4 w-4" style={{ color: carpeta.color || undefined }} />
          ) : (
            <Folder className="h-4 w-4" style={{ color: carpeta.color || undefined }} />
          )}
          <span className="truncate flex-1 text-left">{carpeta.nombre}</span>
          <span className="text-xs text-muted-foreground">{carpeta._count.archivos}</span>
        </div>
        {carpetasExpandidas.has(carpeta.id) && carpeta.children && carpeta.children.length > 0 && (
          renderArbolCarpetas(carpeta.children, nivel + 1)
        )}
      </div>
    ))
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Mi Repositorio</h1>
          <p className="text-sm text-muted-foreground">
            Organiza y gestiona tus documentos PDF firmados
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCrearCarpetaOpen(true)} className="flex-1 sm:flex-none">
            <FolderPlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nueva </span>Carpeta
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="flex-1 sm:flex-none">
            <Upload className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Subir </span>PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Sidebar con árbol de carpetas - oculto en móvil */}
        <Card className="hidden lg:block w-64 shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Carpetas</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <button
                onClick={() => navegarACarpeta(null)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent",
                  carpetaActual === null && "bg-accent font-medium"
                )}
              >
                <Home className="h-4 w-4" />
                <span>Mi Repositorio</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {archivos.filter((a) => !a.carpetaId).length}
                </span>
              </button>
              <div className="mt-1">
                {renderArbolCarpetas(carpetas)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Contenido principal */}
        <Card className="flex-1">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-1 flex-wrap">
                  {rutaNavegacion.map((item, index) => (
                    <span key={item.id ?? "root"} className="flex items-center gap-1">
                      {index > 0 && <ChevronRight className="h-3 w-3" />}
                      <button
                        onClick={() => navegarACarpeta(item.id)}
                        className={cn(
                          "hover:text-foreground",
                          index === rutaNavegacion.length - 1 && "text-foreground font-medium"
                        )}
                      >
                        {item.nombre}
                      </button>
                    </span>
                  ))}
                </div>
                <CardTitle className="text-lg sm:text-xl">
                  {rutaNavegacion[rutaNavegacion.length - 1]?.nombre || "Mi Repositorio"}
                </CardTitle>
                <CardDescription>
                  {subcarpetasActuales.length} carpeta{subcarpetasActuales.length !== 1 ? "s" : ""},{" "}
                  {archivosActuales.length} archivo{archivosActuales.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar archivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-[200px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Subcarpetas */}
                {!searchTerm && subcarpetasActuales.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {subcarpetasActuales.map((carpeta) => (
                      <div
                        key={carpeta.id}
                        className="group relative flex flex-col items-center p-2 sm:p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => navegarACarpeta(carpeta.id)}
                      >
                        <Folder
                          className="h-10 w-10 sm:h-12 sm:w-12 mb-1 sm:mb-2"
                          style={{ color: carpeta.color || undefined }}
                        />
                        <span className="text-xs sm:text-sm font-medium text-center truncate w-full">
                          {carpeta.nombre}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {carpeta._count.archivos} archivo{carpeta._count.archivos !== 1 ? "s" : ""}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navegarACarpeta(carpeta.id)}>
                              <FolderOpen className="mr-2 h-4 w-4" />
                              Abrir
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirEditarCarpeta(carpeta)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setItemEliminar({ tipo: "carpeta", item: carpeta })
                                setConfirmarEliminarOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}

                {/* Archivos */}
                {archivosActuales.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {archivosActuales.map((archivo) => (
                      <div
                        key={archivo.id}
                        className="group relative flex flex-col items-center p-2 sm:p-3 border rounded-lg hover:bg-accent"
                      >
                        <div className="relative">
                          <FileText className="h-10 w-10 sm:h-12 sm:w-12 mb-1 sm:mb-2 text-red-500" />
                          {archivo.firmado && (
                            <Shield className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-center truncate w-full">
                          {archivo.nombre}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatFileSize(archivo.tamanio)}
                        </span>
                        {archivo.firmado && (
                          <Badge variant="outline" className="mt-1 text-[10px] sm:text-xs">
                            <CheckCircle className="mr-1 h-2 w-2 sm:h-3 sm:w-3 text-green-500" />
                            Firmado
                          </Badge>
                        )}
                        {searchTerm && archivo.carpeta && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            en {archivo.carpeta.nombre}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={archivo.url} target="_blank" rel="noopener noreferrer">
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={archivo.url} download={archivo.nombreArchivo}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => abrirEditarArchivo(archivo)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirMoverArchivo(archivo)}>
                              <Move className="mr-2 h-4 w-4" />
                              Mover
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!archivo.firmado && (
                              <DropdownMenuItem
                                onClick={() => {
                                  toast.info("Firma Perú estará disponible próximamente")
                                }}
                                className="text-blue-600"
                              >
                                <PenTool className="mr-2 h-4 w-4" />
                                Firmar con Firma Perú
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setItemEliminar({ tipo: "archivo", item: archivo })
                                setConfirmarEliminarOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ) : (
                  !searchTerm && subcarpetasActuales.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <File className="h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-semibold">Carpeta vacía</h3>
                      <p className="text-muted-foreground">
                        Sube PDFs o crea subcarpetas para organizar tus documentos
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" onClick={() => setCrearCarpetaOpen(true)}>
                          <FolderPlus className="mr-2 h-4 w-4" />
                          Nueva Carpeta
                        </Button>
                        <Button onClick={() => setUploadOpen(true)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Subir PDF
                        </Button>
                      </div>
                    </div>
                  )
                )}

                {searchTerm && archivosActuales.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">Sin resultados</h3>
                    <p className="text-muted-foreground">
                      No se encontraron archivos que coincidan con &quot;{searchTerm}&quot;
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Crear Carpeta */}
      <Dialog open={crearCarpetaOpen} onOpenChange={setCrearCarpetaOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Carpeta</DialogTitle>
            <DialogDescription>
              Crea una nueva carpeta para organizar tus documentos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={carpetaForm.nombre}
                onChange={(e) => setCarpetaForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Oficios 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={carpetaForm.descripcion}
                onChange={(e) => setCarpetaForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción opcional de la carpeta"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {coloresDisponibles.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setCarpetaForm((prev) => ({ ...prev, color: color.value }))}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      carpetaForm.color === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
                {carpetaForm.color && (
                  <button
                    type="button"
                    onClick={() => setCarpetaForm((prev) => ({ ...prev, color: "" }))}
                    className="w-8 h-8 rounded-full border border-dashed border-muted-foreground flex items-center justify-center hover:bg-muted"
                    title="Sin color"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCrearCarpetaOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleCrearCarpeta} disabled={actionLoading} className="w-full sm:w-auto">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Carpeta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Carpeta */}
      <Dialog open={editarCarpetaOpen} onOpenChange={setEditarCarpetaOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Carpeta</DialogTitle>
            <DialogDescription>
              Modifica los datos de la carpeta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre *</Label>
              <Input
                id="edit-nombre"
                value={carpetaForm.nombre}
                onChange={(e) => setCarpetaForm((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <Textarea
                id="edit-descripcion"
                value={carpetaForm.descripcion}
                onChange={(e) => setCarpetaForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {coloresDisponibles.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setCarpetaForm((prev) => ({ ...prev, color: color.value }))}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      carpetaForm.color === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setCarpetaForm((prev) => ({ ...prev, color: "" }))}
                  className="w-8 h-8 rounded-full border border-dashed border-muted-foreground flex items-center justify-center hover:bg-muted"
                  title="Sin color"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditarCarpetaOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleEditarCarpeta} disabled={actionLoading} className="w-full sm:w-auto">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Subir Archivo */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subir PDF</DialogTitle>
            <DialogDescription>
              Sube un documento PDF a tu repositorio
              {carpetaActual && (
                <span className="block mt-1">
                  Se guardará en: <strong>{rutaNavegacion[rutaNavegacion.length - 1]?.nombre}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="archivo">Archivo PDF *</Label>
              <Input
                id="archivo"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setArchivosSubir(files)
                  if (files.length === 1) {
                    setNombreArchivoSubir(files[0].name.replace(".pdf", ""))
                  }
                }}
              />
              {archivosSubir.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {archivosSubir.map((f) => f.name).join(", ")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre-archivo">Nombre del documento</Label>
              <Input
                id="nombre-archivo"
                value={nombreArchivoSubir}
                onChange={(e) => setNombreArchivoSubir(e.target.value)}
                placeholder="Nombre descriptivo del documento"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSubirArchivo} disabled={uploadLoading || archivosSubir.length === 0} className="w-full sm:w-auto">
              {uploadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Archivo */}
      <Dialog open={editarArchivoOpen} onOpenChange={setEditarArchivoOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Archivo</DialogTitle>
            <DialogDescription>
              Modifica los datos del archivo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-archivo-nombre">Nombre *</Label>
              <Input
                id="edit-archivo-nombre"
                value={archivoForm.nombre}
                onChange={(e) => setArchivoForm((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditarArchivoOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleEditarArchivo} disabled={actionLoading} className="w-full sm:w-auto">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Mover Archivo */}
      <Dialog open={moverArchivoOpen} onOpenChange={setMoverArchivoOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mover Archivo</DialogTitle>
            <DialogDescription>
              Selecciona la carpeta destino para &quot;{archivoSeleccionado?.nombre}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Carpeta destino</Label>
              <Select
                value={moverForm.carpetaId}
                onValueChange={(value) => setMoverForm({ carpetaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una carpeta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raiz">
                    <span className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Mi Repositorio (raíz)
                    </span>
                  </SelectItem>
                  {carpetasPlanas.map((carpeta) => (
                    <SelectItem key={carpeta.id} value={carpeta.id}>
                      <span className="flex items-center gap-2">
                        <Folder className="h-4 w-4" style={{ color: carpeta.color || undefined }} />
                        {carpeta.nombre}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setMoverArchivoOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleMoverArchivo} disabled={actionLoading} className="w-full sm:w-auto">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar Eliminar */}
      <AlertDialog open={confirmarEliminarOpen} onOpenChange={setConfirmarEliminarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {itemEliminar?.tipo === "carpeta" ? "carpeta" : "archivo"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemEliminar?.tipo === "carpeta" ? (
                <>
                  La carpeta &quot;{(itemEliminar.item as Carpeta).nombre}&quot; será eliminada permanentemente.
                  <br />
                  <strong>Nota:</strong> Solo puedes eliminar carpetas vacías.
                </>
              ) : (
                <>
                  El archivo &quot;{(itemEliminar?.item as Archivo)?.nombre}&quot; será eliminado permanentemente.
                  <br />
                  <strong>Advertencia:</strong> Si este archivo está siendo usado en trámites, los trámites mostrarán &quot;Archivo no disponible&quot;.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
