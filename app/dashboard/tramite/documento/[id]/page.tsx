"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  Calendar,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  Archive,
  Paperclip,
  History,
  Mail,
  Download,
  Printer,
  FileSignature,
  ArrowRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"

interface Documento {
  id: string
  correlativo: string
  anio: number
  asunto: string
  contenido: string | null
  folios: number
  estado: string
  prioridad: string
  tipoFirma: string
  archivoFirmadoUrl: string | null
  fechaDocumento: string
  fechaEnvio: string | null
  observaciones: string | null
  createdAt: string
  tipoDocumento: {
    id: string
    codigo: string
    nombre: string
    requiereFirma: boolean
  }
  dependenciaOrigen: {
    id: string
    codigo: string
    nombre: string
    siglas: string
  }
  remitente: {
    id: string
    nombre: string
    apellidos: string
    cargo: string | null
    email: string
  }
  destinos: {
    id: string
    dependenciaDestinoId: string
    esCopia: boolean
    estadoRecepcion: string
    fechaRecepcion: string | null
    dependenciaDestino: {
      id: string
      codigo: string
      nombre: string
      siglas: string
    }
    receptor: {
      nombre: string
      apellidos: string
    } | null
  }[]
  archivosAdjuntos: {
    id: string
    nombre: string
    tipo: string
    tamanio: number
    url: string
    createdAt: string
  }[]
  historial: {
    id: string
    accion: string
    descripcion: string | null
    estadoAnterior: string | null
    estadoNuevo: string | null
    createdAt: string
    usuario: {
      nombre: string
      apellidos: string
    }
    dependencia: {
      siglas: string
      nombre: string
    } | null
  }[]
  usuarioActual: {
    id: string
    dependenciaId: string | null
  }
}

const estadoColors: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  RECIBIDO: "bg-green-100 text-green-800",
  DERIVADO: "bg-purple-100 text-purple-800",
  OBSERVADO: "bg-orange-100 text-orange-800",
  ATENDIDO: "bg-teal-100 text-teal-800",
  ARCHIVADO: "bg-slate-100 text-slate-800",
}

const estadoRecepcionColors: Record<string, string> = {
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

const accionIcons: Record<string, typeof Clock> = {
  CREADO: FileText,
  ENVIADO: Send,
  RECIBIDO: CheckCircle,
  DERIVADO: ArrowRight,
  OBSERVADO: AlertCircle,
  ATENDIDO: CheckCircle,
  ARCHIVADO: Archive,
  FIRMADO: FileSignature,
}

export default function DocumentoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [documento, setDocumento] = useState<Documento | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocumento()
  }, [id])

  const fetchDocumento = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tramite/documentos/${id}`)
      if (response.ok) {
        const data = await response.json()
        setDocumento(data)
      } else if (response.status === 404) {
        toast.error("Documento no encontrado")
        router.push("/dashboard/tramite/mis-documentos")
      } else if (response.status === 403) {
        toast.error("No tiene acceso a este documento")
        router.push("/dashboard/tramite/mis-documentos")
      }
    } catch (error) {
      console.error("Error al cargar documento:", error)
      toast.error("Error al cargar el documento")
    } finally {
      setLoading(false)
    }
  }

  const handleRecibir = async (destinoId: string) => {
    try {
      const response = await fetch("/api/tramite/recibir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentoId: id, destinoId }),
      })

      if (response.ok) {
        toast.success("Documento recibido correctamente")
        fetchDocumento()
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-muted-foreground">Cargando documento...</div>
      </div>
    )
  }

  if (!documento) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-muted-foreground">Documento no encontrado</div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {documento.tipoDocumento.codigo}-{documento.correlativo}-{documento.anio}
            </h1>
            <p className="text-muted-foreground">{documento.tipoDocumento.nombre}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={estadoColors[documento.estado]} variant="outline">
            {documento.estado}
          </Badge>
          <Badge className={prioridadColors[documento.prioridad]}>
            {documento.prioridad}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Información del documento */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{documento.asunto}</h4>
              </div>

              {documento.contenido && (
                <div>
                  <h5 className="font-medium text-sm text-muted-foreground mb-2">
                    Contenido
                  </h5>
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
                    {documento.contenido}
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Folios</span>
                  <p className="font-medium">{documento.folios}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo de Firma</span>
                  <p className="font-medium capitalize">
                    {documento.tipoFirma.toLowerCase().replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha Documento</span>
                  <p className="font-medium">{formatDate(documento.fechaDocumento)}</p>
                </div>
              </div>

              {documento.observaciones && (
                <>
                  <Separator />
                  <div>
                    <h5 className="font-medium text-sm text-muted-foreground mb-2">
                      Observaciones
                    </h5>
                    <p>{documento.observaciones}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Destinatarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Destinatarios
              </CardTitle>
              <CardDescription>
                {documento.destinos.length} destinatario
                {documento.destinos.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dependencia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Recibido por</TableHead>
                    <TableHead>Fecha Recepción</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documento.destinos.map((destino) => (
                    <TableRow key={destino.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {destino.dependenciaDestino.siglas}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {destino.dependenciaDestino.nombre}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={destino.esCopia ? "outline" : "secondary"}>
                          {destino.esCopia ? "Copia (CC)" : "Principal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoRecepcionColors[destino.estadoRecepcion]}>
                          {destino.estadoRecepcion}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {destino.receptor ? (
                          <span className="text-sm">
                            {destino.receptor.nombre}{" "}
                            {destino.receptor.apellidos}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {destino.fechaRecepcion ? (
                          formatDateTime(destino.fechaRecepcion)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {destino.estadoRecepcion === "PENDIENTE" &&
                         destino.dependenciaDestinoId === documento.usuarioActual.dependenciaId && (
                          <Button
                            size="sm"
                            onClick={() => handleRecibir(destino.id)}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Recibir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Archivos adjuntos */}
          {documento.archivosAdjuntos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Archivos Adjuntos
                </CardTitle>
                <CardDescription>
                  {documento.archivosAdjuntos.length} archivo
                  {documento.archivosAdjuntos.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documento.archivosAdjuntos.map((archivo) => (
                    <div
                      key={archivo.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{archivo.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {archivo.tipo} - {formatFileSize(archivo.tamanio)}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={archivo.url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-4 w-4" />
                          Descargar
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Acciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documento.historial.map((item, index) => {
                  const IconComponent = accionIcons[item.accion] || Clock
                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b last:border-b-0"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{item.accion}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.usuario.nombre} {item.usuario.apellidos}
                              {item.dependencia && ` - ${item.dependencia.siglas}`}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                        {item.descripcion && (
                          <p className="text-sm mt-1">{item.descripcion}</p>
                        )}
                        {item.estadoAnterior && item.estadoNuevo && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Estado: {item.estadoAnterior} → {item.estadoNuevo}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documento.estado === "BORRADOR" && (
                <Button className="w-full" asChild>
                  <Link href={`/dashboard/tramite/editar/${documento.id}`}>
                    Editar Documento
                  </Link>
                </Button>
              )}
              {documento.estado !== "ARCHIVADO" &&
                documento.estado !== "BORRADOR" && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/dashboard/tramite/derivar/${documento.id}`}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Derivar
                    </Link>
                  </Button>
                )}
              <Button variant="outline" className="w-full">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </CardContent>
          </Card>

          {/* Origen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Origen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Dependencia</span>
                <p className="font-medium">{documento.dependenciaOrigen.siglas}</p>
                <p className="text-sm text-muted-foreground">
                  {documento.dependenciaOrigen.nombre}
                </p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Remitente</span>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {documento.remitente.nombre} {documento.remitente.apellidos}
                    </p>
                    {documento.remitente.cargo && (
                      <p className="text-sm text-muted-foreground">
                        {documento.remitente.cargo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Creado</span>
                <span className="text-sm">{formatDateTime(documento.createdAt)}</span>
              </div>
              {documento.fechaEnvio && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Enviado</span>
                  <span className="text-sm">
                    {formatDateTime(documento.fechaEnvio)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
