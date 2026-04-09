"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { FirmaModal } from "@/components/firma-peru/firma-modal"
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
  ChevronLeft,
  Home,
  Shield,
  Loader2,
  CheckCircle,
  X,
  PenTool,
  ArrowUpDown,
  FolderInput,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Carpeta {
  id: string
  nombre: string
  descripcion: string | null
  color: string | null
  parentId: string | null
  _count: { hijos: number; archivos: number }
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
  carpeta?: { id: string; nombre: string } | null
  _count?: { usosEnTramites: number }
}

type ItemLista = { tipo: "carpeta"; data: Carpeta } | { tipo: "archivo"; data: Archivo }

const coloresDisponibles = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Amarillo" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#8b5cf6", label: "Morado" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6b7280", label: "Gris" },
]

const OPCIONES_PAGINADO = [10, 20, 50, 100]

export default function RepositorioPage() {
  const [carpetas, setCarpetas] = useState<Carpeta[]>([])
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [carpetasPlanas, setCarpetasPlanas] = useState<Carpeta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [paginaActual, setPaginaActual] = useState(1)
  const [itemsPorPagina, setItemsPorPagina] = useState(20)
  const [ordenCol, setOrdenCol] = useState<"nombre" | "fecha" | "tamanio">("nombre")
  const [ordenDir, setOrdenDir] = useState<"asc" | "desc">("asc")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  // Navegación
  const [carpetaActual, setCarpetaActual] = useState<string | null>(null)
  const [rutaNavegacion, setRutaNavegacion] = useState<{ id: string | null; nombre: string }[]>([
    { id: null, nombre: "Mi Repositorio" },
  ])

  // Modales
  const [crearCarpetaOpen, setCrearCarpetaOpen] = useState(false)
  const [editarCarpetaOpen, setEditarCarpetaOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editarArchivoOpen, setEditarArchivoOpen] = useState(false)
  const [moverOpen, setMoverOpen] = useState(false)
  const [confirmarEliminarOpen, setConfirmarEliminarOpen] = useState(false)

  // Forms
  const [carpetaForm, setCarpetaForm] = useState({ nombre: "", descripcion: "", color: "" })
  const [archivoForm, setArchivoForm] = useState({ nombre: "" })
  const [moverDestino, setMoverDestino] = useState("")
  const [itemsMover, setItemsMover] = useState<Array<{ tipo: string; id: string; nombre: string }>>([])

  // Selección
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<Carpeta | null>(null)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<Archivo | null>(null)
  const [itemEliminar, setItemEliminar] = useState<{ tipo: "carpeta" | "archivo"; item: Carpeta | Archivo } | null>(null)

  // Carga
  const [uploadLoading, setUploadLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [archivosSubir, setArchivosSubir] = useState<File[]>([])
  const [nombreArchivoSubir, setNombreArchivoSubir] = useState("")

  // Firma Perú
  const [firmaModalOpen, setFirmaModalOpen] = useState(false)
  const [archivosFirmar, setArchivosFirmar] = useState<{ id: string; nombre: string; url: string }[]>([])

  const abrirFirmaModal = (archivo: Archivo) => {
    setArchivosFirmar([{ id: archivo.id, nombre: archivo.nombre, url: archivo.url }])
    setFirmaModalOpen(true)
  }

  const handleFirmaSuccess = useCallback(() => {
    toast.success("Documento firmado digitalmente")
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleCancel = () => toast.info("Firma cancelada")
    window.addEventListener("firma-peru-cancel", handleCancel)
    return () => window.removeEventListener("firma-peru-cancel", handleCancel)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/repositorio/selector")
      if (res.ok) {
        const data = await res.json()
        setCarpetas(data.carpetas)
        setCarpetasPlanas(data.carpetasPlanas)
        setArchivos(data.archivos)
      }
    } catch { toast.error("Error al cargar repositorio") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { setPaginaActual(1); setSeleccionados(new Set()) }, [carpetaActual, searchTerm])

  // Helpers
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })

  const buscarCarpeta = (id: string, lista: Carpeta[]): Carpeta | null => {
    for (const c of lista) {
      if (c.id === id) return c
      if (c.children) {
        const found = buscarCarpeta(id, c.children)
        if (found) return found
      }
    }
    return null
  }

  const obtenerSubcarpetas = (parentId: string | null): Carpeta[] => {
    if (!parentId) return carpetas
    const carpeta = buscarCarpeta(parentId, carpetas)
    return carpeta?.children || []
  }

  const obtenerArchivos = (carpetaId: string | null): Archivo[] =>
    archivos.filter((a) => a.carpetaId === carpetaId)

  // Items de la carpeta actual (carpetas + archivos), con búsqueda y orden
  const itemsLista = useMemo((): ItemLista[] => {
    let subcarpetas = obtenerSubcarpetas(carpetaActual)
    let archsCarpeta = obtenerArchivos(carpetaActual)

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      subcarpetas = subcarpetas.filter((c) => c.nombre.toLowerCase().includes(q))
      archsCarpeta = archivos.filter((a) =>
        a.nombre.toLowerCase().includes(q) || a.nombreArchivo.toLowerCase().includes(q)
      )
    }

    const items: ItemLista[] = [
      ...subcarpetas.map((c) => ({ tipo: "carpeta" as const, data: c })),
      ...archsCarpeta.map((a) => ({ tipo: "archivo" as const, data: a })),
    ]

    items.sort((a, b) => {
      // Carpetas siempre primero
      if (a.tipo !== b.tipo) return a.tipo === "carpeta" ? -1 : 1

      let cmp = 0
      if (ordenCol === "nombre") {
        const nA = a.tipo === "carpeta" ? a.data.nombre : a.data.nombre
        const nB = b.tipo === "carpeta" ? b.data.nombre : b.data.nombre
        cmp = nA.localeCompare(nB)
      } else if (ordenCol === "fecha") {
        const dA = a.tipo === "carpeta" ? "" : (a.data as Archivo).createdAt
        const dB = b.tipo === "carpeta" ? "" : (b.data as Archivo).createdAt
        cmp = dA.localeCompare(dB)
      } else if (ordenCol === "tamanio") {
        const sA = a.tipo === "archivo" ? (a.data as Archivo).tamanio : 0
        const sB = b.tipo === "archivo" ? (b.data as Archivo).tamanio : 0
        cmp = sA - sB
      }
      return ordenDir === "asc" ? cmp : -cmp
    })

    return items
  }, [carpetas, archivos, carpetaActual, searchTerm, ordenCol, ordenDir]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPaginas = Math.ceil(itemsLista.length / itemsPorPagina)
  const itemsPaginados = itemsLista.slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina)

  const toggleOrden = (col: "nombre" | "fecha" | "tamanio") => {
    if (ordenCol === col) setOrdenDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setOrdenCol(col); setOrdenDir("asc") }
  }

  // Navegación
  const navegarCarpeta = (id: string | null, nombre: string) => {
    setCarpetaActual(id)
    if (id === null) {
      setRutaNavegacion([{ id: null, nombre: "Mi Repositorio" }])
    } else {
      const idx = rutaNavegacion.findIndex((r) => r.id === id)
      if (idx >= 0) {
        setRutaNavegacion(rutaNavegacion.slice(0, idx + 1))
      } else {
        setRutaNavegacion([...rutaNavegacion, { id, nombre }])
      }
    }
  }

  // Selección
  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    const ids = itemsPaginados.filter((i) => i.tipo === "archivo").map((i) => i.data.id)
    const allSelected = ids.every((id) => seleccionados.has(id))
    setSeleccionados((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  // CRUD handlers
  const handleCrearCarpeta = async () => {
    if (!carpetaForm.nombre.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/repositorio/carpetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: carpetaForm.nombre.trim(),
          descripcion: carpetaForm.descripcion.trim() || null,
          color: carpetaForm.color || null,
          parentId: carpetaActual,
        }),
      })
      if (res.ok) {
        toast.success("Carpeta creada")
        setCrearCarpetaOpen(false)
        setCarpetaForm({ nombre: "", descripcion: "", color: "" })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al crear carpeta")
      }
    } catch { toast.error("Error de conexión") }
    finally { setActionLoading(false) }
  }

  const handleEditarCarpeta = async () => {
    if (!carpetaSeleccionada || !carpetaForm.nombre.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/repositorio/carpetas/${carpetaSeleccionada.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: carpetaForm.nombre.trim(),
          descripcion: carpetaForm.descripcion.trim() || null,
          color: carpetaForm.color || null,
        }),
      })
      if (res.ok) {
        toast.success("Carpeta actualizada")
        setEditarCarpetaOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error")
      }
    } catch { toast.error("Error de conexión") }
    finally { setActionLoading(false) }
  }

  const handleSubirArchivo = async () => {
    if (archivosSubir.length === 0) return
    setUploadLoading(true)
    try {
      for (const file of archivosSubir) {
        const formData = new FormData()
        formData.append("archivo", file)
        formData.append("nombre", nombreArchivoSubir || file.name.replace(/\.pdf$/i, ""))
        if (carpetaActual) formData.append("carpetaId", carpetaActual)
        const res = await fetch("/api/repositorio/upload", { method: "POST", body: formData })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || `Error al subir ${file.name}`)
        }
      }
      toast.success("Archivo(s) subido(s)")
      setUploadOpen(false)
      setArchivosSubir([])
      setNombreArchivoSubir("")
      fetchData()
    } catch { toast.error("Error de conexión") }
    finally { setUploadLoading(false) }
  }

  const handleEditarArchivo = async () => {
    if (!archivoSeleccionado || !archivoForm.nombre.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/repositorio/archivos/${archivoSeleccionado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: archivoForm.nombre.trim() }),
      })
      if (res.ok) {
        toast.success("Archivo actualizado")
        setEditarArchivoOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error")
      }
    } catch { toast.error("Error de conexión") }
    finally { setActionLoading(false) }
  }

  const handleMover = async () => {
    if (itemsMover.length === 0) return
    setActionLoading(true)
    let ok = 0
    for (const item of itemsMover) {
      try {
        const url = item.tipo === "archivo"
          ? `/api/repositorio/archivos/${item.id}`
          : `/api/repositorio/carpetas/${item.id}`
        const body = item.tipo === "archivo"
          ? { carpetaId: moverDestino === "__raiz__" ? null : moverDestino }
          : { parentId: moverDestino === "__raiz__" ? null : moverDestino }
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (res.ok) ok++
        else { const d = await res.json(); toast.error(d.error || `Error al mover ${item.nombre}`) }
      } catch { /* silenciar */ }
    }
    if (ok > 0) toast.success(`${ok} item(s) movido(s)`)
    setMoverOpen(false)
    setSeleccionados(new Set())
    fetchData()
    setActionLoading(false)
  }

  const handleEliminar = async () => {
    if (!itemEliminar) return
    setActionLoading(true)
    try {
      const url = itemEliminar.tipo === "carpeta"
        ? `/api/repositorio/carpetas/${itemEliminar.item.id}`
        : `/api/repositorio/archivos/${itemEliminar.item.id}`
      const res = await fetch(url, { method: "DELETE" })
      if (res.ok) {
        toast.success(`${itemEliminar.tipo === "carpeta" ? "Carpeta" : "Archivo"} eliminado`)
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al eliminar")
      }
    } catch { toast.error("Error de conexión") }
    finally { setActionLoading(false); setConfirmarEliminarOpen(false); setItemEliminar(null) }
  }

  const abrirMoverSeleccionados = () => {
    const items = archivos
      .filter((a) => seleccionados.has(a.id))
      .map((a) => ({ tipo: "archivo", id: a.id, nombre: a.nombre }))
    setItemsMover(items)
    setMoverDestino("")
    setMoverOpen(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Repositorio Personal</h1>
          <p className="text-sm text-muted-foreground">
            {archivos.length} archivo(s) en {carpetasPlanas.length} carpeta(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            setCarpetaForm({ nombre: "", descripcion: "", color: "" })
            setCrearCarpetaOpen(true)
          }}>
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Carpeta</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => {
            setArchivosSubir([]); setNombreArchivoSubir(""); setUploadOpen(true)
          }}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Subir PDF</span>
          </Button>
        </div>
      </div>

      {/* Breadcrumb + Search + Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-wrap flex-1 min-w-0">
          {rutaNavegacion.map((r, i) => (
            <div key={r.id || "root"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <button
                onClick={() => navegarCarpeta(r.id, r.nombre)}
                className={cn(
                  "hover:underline truncate max-w-[120px] sm:max-w-[200px]",
                  i === rutaNavegacion.length - 1 ? "font-medium" : "text-muted-foreground"
                )}
              >
                {i === 0 ? <Home className="h-4 w-4 inline" /> : r.nombre}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {seleccionados.size > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={abrirMoverSeleccionados}>
              <FolderInput className="h-4 w-4" />
              Mover {seleccionados.size}
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[180px] sm:w-[220px] h-8"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabla */}
      {itemsLista.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 sm:p-12 text-center">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">
              {searchTerm ? "Sin resultados" : "Carpeta vacía"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm ? "No se encontraron archivos con la búsqueda" : "Crea una carpeta o sube un archivo para comenzar"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] px-2">
                      <Checkbox
                        checked={itemsPaginados.filter((i) => i.tipo === "archivo").length > 0 &&
                          itemsPaginados.filter((i) => i.tipo === "archivo").every((i) => seleccionados.has(i.data.id))}
                        onCheckedChange={toggleTodos}
                      />
                    </TableHead>
                    <TableHead className="text-xs cursor-pointer select-none" onClick={() => toggleOrden("nombre")}>
                      <div className="flex items-center gap-1">
                        Nombre
                        {ordenCol === "nombre" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-xs">Carpeta</TableHead>
                    <TableHead className="hidden md:table-cell text-xs cursor-pointer select-none" onClick={() => toggleOrden("tamanio")}>
                      <div className="flex items-center gap-1">
                        Tamaño
                        {ordenCol === "tamanio" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="hidden lg:table-cell text-xs cursor-pointer select-none" onClick={() => toggleOrden("fecha")}>
                      <div className="flex items-center gap-1">
                        Fecha
                        {ordenCol === "fecha" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsPaginados.map((item) => {
                    if (item.tipo === "carpeta") {
                      const c = item.data as Carpeta
                      return (
                        <TableRow
                          key={`c-${c.id}`}
                          className="cursor-pointer hover:bg-accent/50"
                          onDoubleClick={() => navegarCarpeta(c.id, c.nombre)}
                        >
                          <TableCell className="px-2 py-2" />
                          <TableCell className="py-2">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => navegarCarpeta(c.id, c.nombre)}
                            >
                              <Folder className="h-4 w-4 shrink-0" style={{ color: c.color || "#6b7280" }} />
                              <span className="font-medium text-sm">{c.nombre}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {c._count.archivos} archivo(s)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground py-2">—</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground py-2">—</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground py-2">—</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px]">Carpeta</Badge>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setCarpetaSeleccionada(c)
                                  setCarpetaForm({ nombre: c.nombre, descripcion: c.descripcion || "", color: c.color || "" })
                                  setEditarCarpetaOpen(true)
                                }}>
                                  <Edit2 className="mr-2 h-4 w-4" />Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setItemsMover([{ tipo: "carpeta", id: c.id, nombre: c.nombre }])
                                  setMoverDestino("")
                                  setMoverOpen(true)
                                }}>
                                  <FolderInput className="mr-2 h-4 w-4" />Mover
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => {
                                  setItemEliminar({ tipo: "carpeta", item: c })
                                  setConfirmarEliminarOpen(true)
                                }}>
                                  <Trash2 className="mr-2 h-4 w-4" />Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    const a = item.data as Archivo
                    return (
                      <TableRow key={`a-${a.id}`} className={seleccionados.has(a.id) ? "bg-primary/5" : ""}>
                        <TableCell className="px-2 py-2">
                          <Checkbox checked={seleccionados.has(a.id)} onCheckedChange={() => toggleSeleccion(a.id)} />
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]">{a.nombre}</p>
                              <p className="sm:hidden text-[10px] text-muted-foreground">
                                {formatSize(a.tamanio)} — {formatDate(a.createdAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground py-2 truncate max-w-[100px]">
                          {a.carpeta?.nombre || "Raíz"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs py-2">{formatSize(a.tamanio)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground py-2">{formatDate(a.createdAt)}</TableCell>
                        <TableCell className="py-2">
                          {a.firmado ? (
                            <Badge className="bg-green-100 text-green-800 gap-1 text-[10px]">
                              <Shield className="h-3 w-3" />Firmado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">PDF</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(a.url, "_blank")}>
                                <Eye className="mr-2 h-4 w-4" />Ver
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const link = document.createElement("a")
                                link.href = a.url; link.download = a.nombreArchivo
                                link.click()
                              }}>
                                <Download className="mr-2 h-4 w-4" />Descargar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setArchivoSeleccionado(a)
                                setArchivoForm({ nombre: a.nombre })
                                setEditarArchivoOpen(true)
                              }}>
                                <Edit2 className="mr-2 h-4 w-4" />Renombrar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setItemsMover([{ tipo: "archivo", id: a.id, nombre: a.nombre }])
                                setMoverDestino("")
                                setMoverOpen(true)
                              }}>
                                <FolderInput className="mr-2 h-4 w-4" />Mover
                              </DropdownMenuItem>
                              {!a.firmado && (
                                <DropdownMenuItem onClick={() => abrirFirmaModal(a)}>
                                  <PenTool className="mr-2 h-4 w-4" />Firmar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => {
                                setItemEliminar({ tipo: "archivo", item: a })
                                setConfirmarEliminarOpen(true)
                              }}>
                                <Trash2 className="mr-2 h-4 w-4" />Eliminar
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-t">
              <div className="flex items-center gap-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {seleccionados.size > 0 ? `${seleccionados.size} seleccionado(s) — ` : ""}
                  {itemsLista.length} item(s)
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Mostrar</span>
                  <Select value={String(itemsPorPagina)} onValueChange={(v) => { setItemsPorPagina(Number(v)); setPaginaActual(1) }}>
                    <SelectTrigger className="h-7 w-[70px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCIONES_PAGINADO.map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground hidden sm:inline">por página</span>
                </div>
              </div>
              {totalPaginas > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground">{paginaActual} / {totalPaginas}</span>
                  <Button variant="outline" size="sm" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual((p) => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Crear Carpeta */}
      <Dialog open={crearCarpetaOpen} onOpenChange={setCrearCarpetaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Carpeta</DialogTitle>
            <DialogDescription>Se creará en {rutaNavegacion[rutaNavegacion.length - 1]?.nombre || "la raíz"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input value={carpetaForm.nombre} onChange={(e) => setCarpetaForm({ ...carpetaForm, nombre: e.target.value })} placeholder="Nombre de la carpeta..." />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea value={carpetaForm.descripcion} onChange={(e) => setCarpetaForm({ ...carpetaForm, descripcion: e.target.value })} placeholder="Descripción opcional..." />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {coloresDisponibles.map((c) => (
                  <button key={c.value} onClick={() => setCarpetaForm({ ...carpetaForm, color: c.value })}
                    className={cn("h-7 w-7 rounded-full border-2 transition-transform", carpetaForm.color === c.value ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c.value }} title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCrearCarpetaOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrearCarpeta} disabled={actionLoading || !carpetaForm.nombre.trim()}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Carpeta */}
      <Dialog open={editarCarpetaOpen} onOpenChange={setEditarCarpetaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Carpeta</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input value={carpetaForm.nombre} onChange={(e) => setCarpetaForm({ ...carpetaForm, nombre: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea value={carpetaForm.descripcion} onChange={(e) => setCarpetaForm({ ...carpetaForm, descripcion: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {coloresDisponibles.map((c) => (
                  <button key={c.value} onClick={() => setCarpetaForm({ ...carpetaForm, color: c.value })}
                    className={cn("h-7 w-7 rounded-full border-2", carpetaForm.color === c.value ? "border-foreground scale-110" : "border-transparent")}
                    style={{ backgroundColor: c.value }} title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarCarpetaOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditarCarpeta} disabled={actionLoading || !carpetaForm.nombre.trim()}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Subir PDF */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Archivo PDF</DialogTitle>
            <DialogDescription>Máximo 10MB por archivo. Solo PDF.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Archivo *</Label>
              <Input type="file" accept=".pdf" onChange={(e) => {
                if (e.target.files) setArchivosSubir(Array.from(e.target.files))
              }} />
            </div>
            <div className="grid gap-2">
              <Label>Nombre descriptivo</Label>
              <Input value={nombreArchivoSubir} onChange={(e) => setNombreArchivoSubir(e.target.value)} placeholder="Nombre para identificar..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubirArchivo} disabled={uploadLoading || archivosSubir.length === 0}>
              {uploadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Renombrar Archivo */}
      <Dialog open={editarArchivoOpen} onOpenChange={setEditarArchivoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Renombrar Archivo</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Nombre</Label>
            <Input value={archivoForm.nombre} onChange={(e) => setArchivoForm({ nombre: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarArchivoOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditarArchivo} disabled={actionLoading || !archivoForm.nombre.trim()}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Mover Items */}
      <Dialog open={moverOpen} onOpenChange={setMoverOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderInput className="h-5 w-5" />Mover {itemsMover.length} item(s)</DialogTitle>
            <DialogDescription>Selecciona la carpeta destino</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80px] overflow-y-auto border rounded p-2 space-y-1 text-xs">
            {itemsMover.map((i) => (
              <div key={i.id} className="flex items-center gap-2">
                {i.tipo === "carpeta" ? <Folder className="h-3 w-3" /> : <FileText className="h-3 w-3 text-red-500" />}
                <span className="truncate">{i.nombre}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-2 py-2">
            <Label>Carpeta destino</Label>
            <Select value={moverDestino} onValueChange={setMoverDestino}>
              <SelectTrigger><SelectValue placeholder="Seleccionar carpeta..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__raiz__">Mi Repositorio (raíz)</SelectItem>
                {carpetasPlanas
                  .filter((c) => !itemsMover.some((i) => i.id === c.id))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoverOpen(false)}>Cancelar</Button>
            <Button onClick={handleMover} disabled={actionLoading || !moverDestino}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <AlertDialog open={confirmarEliminarOpen} onOpenChange={setConfirmarEliminarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              {itemEliminar?.tipo === "carpeta"
                ? "¿Está seguro de eliminar esta carpeta? Solo se puede eliminar si está vacía."
                : "¿Está seguro de eliminar este archivo? Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-red-600 hover:bg-red-700">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Firma Modal */}
      <FirmaModal
        isOpen={firmaModalOpen}
        archivos={archivosFirmar}
        onClose={() => setFirmaModalOpen(false)}
        onSuccess={handleFirmaSuccess}
      />
    </div>
  )
}
