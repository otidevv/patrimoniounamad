"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FilePlus,
  Save,
  Send,
  X,
  Plus,
  Building2,
  FileUp,
  FileCheck,
  AlertCircle,
  ChevronsUpDown,
  Check,
  FolderArchive,
  Folder,
  FileText,
  Search,
  ChevronRight,
  Home,
  Shield,
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Separator } from "@/components/ui/separator"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TipoDocumento {
  id: string
  codigo: string
  nombre: string
  requiereFirma: boolean
}

interface Dependencia {
  id: string
  codigo: string
  nombre: string
  siglas: string
}

interface Usuario {
  id: string
  nombre: string
  apellidos: string
  cargo: string | null
  email: string
}

interface CarpetaRepositorio {
  id: string
  nombre: string
  color: string | null
  parentId: string | null
  _count: {
    archivos: number
    hijos: number
  }
}

interface ArchivoRepositorio {
  id: string
  nombre: string
  nombreArchivo: string
  url: string
  tamanio: number
  firmado: boolean
  carpetaId: string | null
  createdAt: string
}

export default function NuevoDocumentoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([])
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  // Cache de usuarios por dependencia
  const [usuariosPorDependencia, setUsuariosPorDependencia] = useState<Record<string, Usuario[]>>({})

  // Datos del formulario
  const [formData, setFormData] = useState({
    tipoDocumentoId: "",
    correlativo: "",
    anio: new Date().getFullYear(),
    asunto: "",
    referencia: "",
    folios: 1,
    prioridad: "NORMAL",
    observaciones: "",
  })

  // Archivo PDF (obligatorio) - puede ser archivo subido o del repositorio
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null)
  const [archivoRepositorio, setArchivoRepositorio] = useState<ArchivoRepositorio | null>(null)
  const [archivoError, setArchivoError] = useState<string>("")

  // Modal selector de repositorio
  const [repositorioModalOpen, setRepositorioModalOpen] = useState(false)
  const [repositorioCarpetas, setRepositorioCarpetas] = useState<CarpetaRepositorio[]>([])
  const [repositorioArchivos, setRepositorioArchivos] = useState<ArchivoRepositorio[]>([])
  const [repositorioCarpetaActual, setRepositorioCarpetaActual] = useState<string | null>(null)
  const [repositorioBusqueda, setRepositorioBusqueda] = useState("")
  const [repositorioLoading, setRepositorioLoading] = useState(false)

  // Destinatarios con usuario específico
  const [destinatarios, setDestinatarios] = useState<{
    dependenciaId: string
    destinatarioId: string
    esCopia: boolean
  }[]>([])

  // Estado para controlar los popovers de dependencias
  const [openDependenciaPopover, setOpenDependenciaPopover] = useState<number | null>(null)

  useEffect(() => {
    fetchTiposDocumento()
    fetchDependencias()
  }, [])

  const fetchTiposDocumento = async () => {
    try {
      const response = await fetch("/api/tramite/tipos-documento")
      if (response.ok) {
        const data = await response.json()
        setTiposDocumento(data)
      }
    } catch (error) {
      console.error("Error al cargar tipos de documento:", error)
    }
  }

  const fetchDependencias = async () => {
    try {
      const response = await fetch("/api/dependencias")
      if (response.ok) {
        const data = await response.json()
        setDependencias(data)
      }
    } catch (error) {
      console.error("Error al cargar dependencias:", error)
    }
  }

  // Cargar usuarios de una dependencia (con cache)
  const fetchUsuariosDependencia = async (dependenciaId: string) => {
    if (usuariosPorDependencia[dependenciaId]) {
      return // Ya está en cache
    }
    try {
      const response = await fetch(`/api/usuarios/por-dependencia/${dependenciaId}`)
      if (response.ok) {
        const data = await response.json()
        setUsuariosPorDependencia(prev => ({
          ...prev,
          [dependenciaId]: data
        }))
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
    }
  }

  // Cargar datos del repositorio
  const fetchRepositorio = async () => {
    setRepositorioLoading(true)
    try {
      const response = await fetch("/api/repositorio/selector")
      if (response.ok) {
        const data = await response.json()
        setRepositorioCarpetas(data.carpetasPlanas || [])
        setRepositorioArchivos(data.archivos || [])
      }
    } catch (error) {
      console.error("Error al cargar repositorio:", error)
    } finally {
      setRepositorioLoading(false)
    }
  }

  const abrirSelectorRepositorio = () => {
    setRepositorioCarpetaActual(null)
    setRepositorioBusqueda("")
    fetchRepositorio()
    setRepositorioModalOpen(true)
  }

  const seleccionarArchivoRepositorio = (archivo: ArchivoRepositorio) => {
    setArchivoRepositorio(archivo)
    setArchivoPDF(null) // Limpiar archivo subido si había
    setArchivoError("")
    setRepositorioModalOpen(false)
    toast.success("Archivo seleccionado del repositorio")
  }

  // Archivos filtrados por carpeta actual y búsqueda
  const archivosFiltrados = repositorioArchivos.filter((archivo) => {
    if (repositorioBusqueda) {
      return archivo.nombre.toLowerCase().includes(repositorioBusqueda.toLowerCase())
    }
    return archivo.carpetaId === repositorioCarpetaActual
  })

  // Subcarpetas de la carpeta actual
  const subcarpetasActuales = repositorioCarpetas.filter(
    (c) => c.parentId === repositorioCarpetaActual
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setArchivoError("")

    if (!file) {
      setArchivoPDF(null)
      return
    }

    // Validar que sea PDF
    if (file.type !== "application/pdf") {
      setArchivoError("Solo se permiten archivos PDF")
      setArchivoPDF(null)
      return
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setArchivoError("El archivo no debe superar los 10MB")
      setArchivoPDF(null)
      return
    }

    setArchivoPDF(file)
    setArchivoRepositorio(null) // Limpiar archivo de repositorio si había
  }

  const limpiarArchivo = () => {
    setArchivoPDF(null)
    setArchivoRepositorio(null)
    setArchivoError("")
  }

  const addDestinatario = (esCopia: boolean = false) => {
    setDestinatarios([...destinatarios, { dependenciaId: "", destinatarioId: "", esCopia }])
  }

  const removeDestinatario = (index: number) => {
    setDestinatarios(destinatarios.filter((_, i) => i !== index))
  }

  const updateDependencia = (index: number, dependenciaId: string) => {
    const updated = [...destinatarios]
    updated[index].dependenciaId = dependenciaId
    updated[index].destinatarioId = "" // Reset destinatario al cambiar dependencia
    setDestinatarios(updated)
    // Cargar usuarios de la dependencia seleccionada
    if (dependenciaId) {
      fetchUsuariosDependencia(dependenciaId)
    }
  }

  const updateDestinatario = (index: number, destinatarioId: string) => {
    const updated = [...destinatarios]
    updated[index].destinatarioId = destinatarioId
    setDestinatarios(updated)
  }

  const handleSubmit = async (enviar: boolean = false) => {
    // Validaciones
    if (!formData.tipoDocumentoId) {
      toast.error("Selecciona un tipo de documento")
      return
    }
    if (!formData.correlativo) {
      toast.error("Ingresa el número correlativo")
      return
    }
    if (!formData.asunto) {
      toast.error("Ingresa el asunto del documento")
      return
    }
    if (!archivoPDF && !archivoRepositorio) {
      toast.error("Debes subir o seleccionar el archivo PDF del documento")
      return
    }
    if (enviar && destinatarios.filter((d) => d.dependenciaId).length === 0) {
      toast.error("Agrega al menos un destinatario para enviar")
      return
    }

    setLoading(true)

    try {
      let archivoData: {
        nombre: string
        url: string
        tipo: string
        tamanio: number
        archivoRepositorioId?: string
      }

      if (archivoRepositorio) {
        // Usar archivo del repositorio (referencia)
        archivoData = {
          nombre: archivoRepositorio.nombre,
          url: archivoRepositorio.url,
          tipo: "application/pdf",
          tamanio: archivoRepositorio.tamanio,
          archivoRepositorioId: archivoRepositorio.id,
        }
      } else if (archivoPDF) {
        // Subir archivo nuevo
        const tipoDoc = tiposDocumento.find(t => t.id === formData.tipoDocumentoId)

        const uploadFormData = new FormData()
        uploadFormData.append("archivo", archivoPDF)
        uploadFormData.append("tipoDocumentoCodigo", tipoDoc?.codigo || "DOC")
        uploadFormData.append("correlativo", formData.correlativo)
        uploadFormData.append("anio", String(formData.anio))

        const uploadResponse = await fetch("/api/tramite/upload", {
          method: "POST",
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json()
          toast.error(error.message || "Error al subir el archivo")
          setLoading(false)
          return
        }

        const uploadResult = await uploadResponse.json()
        archivoData = {
          nombre: uploadResult.nombre,
          url: uploadResult.url,
          tipo: uploadResult.tipo,
          tamanio: uploadResult.tamanio,
        }
      } else {
        toast.error("No hay archivo seleccionado")
        setLoading(false)
        return
      }

      // Crear el documento con la referencia al archivo
      const payload = {
        tipoDocumentoId: formData.tipoDocumentoId,
        correlativo: formData.correlativo,
        anio: formData.anio,
        asunto: formData.asunto,
        referencia: formData.referencia || null,
        folios: formData.folios,
        prioridad: formData.prioridad,
        observaciones: formData.observaciones || null,
        estado: enviar ? "ENVIADO" : "BORRADOR",
        destinatarios: destinatarios.filter((d) => d.dependenciaId),
        archivo: archivoData,
      }

      const response = await fetch("/api/tramite/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(
          enviar
            ? "Documento enviado correctamente"
            : "Documento guardado como borrador"
        )
        router.push(`/dashboard/tramite/documento/${data.id}`)
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al guardar el documento")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al guardar el documento")
    } finally {
      setLoading(false)
    }
  }

  const tipoSeleccionado = tiposDocumento.find((t) => t.id === formData.tipoDocumentoId)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Documento</h1>
          <p className="text-muted-foreground">
            Registra un nuevo documento de trámite
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Formulario principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Archivo PDF - Lo más importante */}
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                Documento PDF *
              </CardTitle>
              <CardDescription>
                Sube un nuevo documento o selecciona uno de tu repositorio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!archivoPDF && !archivoRepositorio ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Opción 1: Subir archivo */}
                    <label
                      htmlFor="archivoPDF"
                      className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer block"
                    >
                      <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <div className="space-y-1">
                        <span className="text-sm font-medium block">
                          Subir nuevo PDF
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Máximo 10MB
                        </p>
                      </div>
                      <Input
                        id="archivoPDF"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {/* Opción 2: Seleccionar del repositorio */}
                    <button
                      type="button"
                      onClick={abrirSelectorRepositorio}
                      className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                    >
                      <FolderArchive className="mx-auto h-10 w-10 text-blue-500 mb-3" />
                      <div className="space-y-1">
                        <span className="text-sm font-medium block">
                          Seleccionar del Repositorio
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Usar un PDF ya subido
                        </p>
                      </div>
                    </button>
                  </div>
                ) : archivoPDF ? (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-10 w-10 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">{archivoPDF.name}</p>
                        <p className="text-sm text-green-700">
                          {formatFileSize(archivoPDF.size)} - Archivo nuevo
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={limpiarArchivo}
                      className="text-green-700 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ) : archivoRepositorio ? (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <FileText className="h-10 w-10 text-blue-600" />
                        {archivoRepositorio.firmado && (
                          <Shield className="absolute -top-1 -right-1 h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">{archivoRepositorio.nombre}</p>
                        <p className="text-sm text-blue-700">
                          {formatFileSize(archivoRepositorio.tamanio)} - Desde repositorio
                          {archivoRepositorio.firmado && " (Firmado)"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={limpiarArchivo}
                      className="text-blue-700 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                ) : null}

                {archivoError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{archivoError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Datos del documento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FilePlus className="h-5 w-5" />
                Datos del Documento
              </CardTitle>
              <CardDescription>
                Metadatos para identificar y clasificar el documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
                  <Select
                    value={formData.tipoDocumentoId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipoDocumentoId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposDocumento.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.codigo} - {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correlativo">N° Correlativo *</Label>
                  <Input
                    id="correlativo"
                    placeholder="Ej: 001"
                    value={formData.correlativo}
                    onChange={(e) =>
                      setFormData({ ...formData, correlativo: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anio">Año</Label>
                  <Input
                    id="anio"
                    type="number"
                    value={formData.anio}
                    onChange={(e) =>
                      setFormData({ ...formData, anio: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto *</Label>
                <Input
                  id="asunto"
                  placeholder="Resumen breve del documento"
                  value={formData.asunto}
                  onChange={(e) =>
                    setFormData({ ...formData, asunto: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia (opcional)</Label>
                <Input
                  id="referencia"
                  placeholder="Ej: Ref. Oficio N° 123-2024-UREDES"
                  value={formData.referencia}
                  onChange={(e) =>
                    setFormData({ ...formData, referencia: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Si este documento responde a otro, indica la referencia
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="folios">Folios</Label>
                  <Input
                    id="folios"
                    type="number"
                    min={1}
                    value={formData.folios}
                    onChange={(e) =>
                      setFormData({ ...formData, folios: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) =>
                      setFormData({ ...formData, prioridad: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAJA">Baja</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="URGENTE">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones internas</Label>
                <Textarea
                  id="observaciones"
                  placeholder="Notas adicionales (solo visibles para tu dependencia)..."
                  rows={2}
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral - Destinatarios */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Destinatarios
              </CardTitle>
              <CardDescription>
                Selecciona las dependencias de destino
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Destinatarios principales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Para (Destinatario principal)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addDestinatario(false)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {destinatarios
                  .filter((d) => !d.esCopia)
                  .map((dest) => {
                    const realIndex = destinatarios.findIndex((d) => d === dest)
                    const usuarios = usuariosPorDependencia[dest.dependenciaId] || []
                    const selectedDep = dependencias.find(d => d.id === dest.dependenciaId)
                    return (
                      <div key={realIndex} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                        <div className="flex gap-2">
                          <Popover
                            open={openDependenciaPopover === realIndex}
                            onOpenChange={(open) => setOpenDependenciaPopover(open ? realIndex : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="flex-1 justify-between font-normal"
                              >
                                {selectedDep
                                  ? `${selectedDep.siglas} - ${selectedDep.nombre}`
                                  : "Buscar dependencia..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
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
                                          updateDependencia(realIndex, dep.id)
                                          setOpenDependenciaPopover(null)
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            dest.dependenciaId === dep.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="font-medium">{dep.siglas}</span>
                                        <span className="ml-2 text-muted-foreground text-sm truncate">{dep.nombre}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDestinatario(realIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {dest.dependenciaId && (
                          <Select
                            value={dest.destinatarioId}
                            onValueChange={(value) => updateDestinatario(realIndex, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar persona..." />
                            </SelectTrigger>
                            <SelectContent>
                              {usuarios.length === 0 ? (
                                <SelectItem value="_none" disabled>
                                  No hay usuarios en esta dependencia
                                </SelectItem>
                              ) : (
                                usuarios.map((usr) => (
                                  <SelectItem key={usr.id} value={usr.id}>
                                    {usr.nombre} {usr.apellidos}
                                    {usr.cargo && ` - ${usr.cargo}`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )
                  })}
                {destinatarios.filter((d) => !d.esCopia).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay destinatarios principales
                  </p>
                )}
              </div>

              <Separator />

              {/* Con copia */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>CC (Con copia)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addDestinatario(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {destinatarios
                  .filter((d) => d.esCopia)
                  .map((dest) => {
                    const realIndex = destinatarios.findIndex((d) => d === dest)
                    const usuarios = usuariosPorDependencia[dest.dependenciaId] || []
                    const selectedDep = dependencias.find(d => d.id === dest.dependenciaId)
                    const popoverKey = 1000 + realIndex // Use offset to differentiate from main recipients
                    return (
                      <div key={realIndex} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                        <div className="flex gap-2">
                          <Popover
                            open={openDependenciaPopover === popoverKey}
                            onOpenChange={(open) => setOpenDependenciaPopover(open ? popoverKey : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="flex-1 justify-between font-normal"
                              >
                                {selectedDep
                                  ? `${selectedDep.siglas} - ${selectedDep.nombre}`
                                  : "Buscar dependencia..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
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
                                          updateDependencia(realIndex, dep.id)
                                          setOpenDependenciaPopover(null)
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            dest.dependenciaId === dep.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="font-medium">{dep.siglas}</span>
                                        <span className="ml-2 text-muted-foreground text-sm truncate">{dep.nombre}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDestinatario(realIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {dest.dependenciaId && (
                          <Select
                            value={dest.destinatarioId}
                            onValueChange={(value) => updateDestinatario(realIndex, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar persona..." />
                            </SelectTrigger>
                            <SelectContent>
                              {usuarios.length === 0 ? (
                                <SelectItem value="_none" disabled>
                                  No hay usuarios en esta dependencia
                                </SelectItem>
                              ) : (
                                usuarios.map((usr) => (
                                  <SelectItem key={usr.id} value={usr.id}>
                                    {usr.nombre} {usr.apellidos}
                                    {usr.cargo && ` - ${usr.cargo}`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )
                  })}
                {destinatarios.filter((d) => d.esCopia).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin copias</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumen antes de enviar */}
          {tipoSeleccionado && formData.correlativo && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vista previa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-mono text-lg font-bold">
                    {tipoSeleccionado.codigo}-{formData.correlativo}-{formData.anio}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {formData.asunto || "Sin asunto"}
                  </p>
                  {(archivoPDF || archivoRepositorio) && (
                    <Badge variant="secondary" className="mt-2">
                      <FileCheck className="mr-1 h-3 w-3" />
                      {archivoRepositorio ? "PDF del repositorio" : "PDF adjunto"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Button
                className="w-full"
                onClick={() => handleSubmit(true)}
                disabled={loading || (!archivoPDF && !archivoRepositorio)}
              >
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Enviando..." : "Enviar Documento"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSubmit(false)}
                disabled={loading || (!archivoPDF && !archivoRepositorio)}
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar Borrador
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Selector de Repositorio */}
      <Dialog open={repositorioModalOpen} onOpenChange={setRepositorioModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderArchive className="h-5 w-5" />
              Seleccionar del Repositorio
            </DialogTitle>
            <DialogDescription>
              Elige un documento PDF de tu repositorio personal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar archivos..."
                value={repositorioBusqueda}
                onChange={(e) => setRepositorioBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Breadcrumb de navegación */}
            {!repositorioBusqueda && (
              <div className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => setRepositorioCarpetaActual(null)}
                  className={cn(
                    "flex items-center gap-1 hover:text-primary",
                    !repositorioCarpetaActual && "font-medium text-primary"
                  )}
                >
                  <Home className="h-4 w-4" />
                  Mi Repositorio
                </button>
                {repositorioCarpetaActual && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {repositorioCarpetas.find((c) => c.id === repositorioCarpetaActual)?.nombre}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Contenido */}
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              {repositorioLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Cargando...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Carpetas */}
                  {!repositorioBusqueda && subcarpetasActuales.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {subcarpetasActuales.map((carpeta) => (
                        <button
                          key={carpeta.id}
                          onClick={() => setRepositorioCarpetaActual(carpeta.id)}
                          className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent text-left"
                        >
                          <Folder
                            className="h-8 w-8 shrink-0"
                            style={{ color: carpeta.color || undefined }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{carpeta.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {carpeta._count.archivos} archivo{carpeta._count.archivos !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Archivos */}
                  {archivosFiltrados.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {archivosFiltrados.map((archivo) => (
                        <button
                          key={archivo.id}
                          onClick={() => seleccionarArchivoRepositorio(archivo)}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left transition-colors"
                        >
                          <div className="relative shrink-0">
                            <FileText className="h-10 w-10 text-red-500" />
                            {archivo.firmado && (
                              <Shield className="absolute -top-1 -right-1 h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{archivo.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(archivo.tamanio)}
                              {archivo.firmado && " • Firmado"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-2 text-muted-foreground">
                        {repositorioBusqueda
                          ? "No se encontraron archivos"
                          : "No hay archivos en esta ubicación"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
