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
  PenTool,
  Shield,
  PackageCheck,
  Package,
  Loader2,
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
import { FirmaModal } from "@/components/firma-peru/firma-modal"

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
  fechaFirma: string | null
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
  transferencias: {
    id: string
    codigoPatrimonial: string
    descripcionBien: string | null
    estado: string
    nombreRemitente: string
    nombreDestinatario: string
    fechaSolicitud: string
    fechaRespuesta: string | null
    verificacion: {
      marcaSiga: string | null
      modeloSiga: string | null
      serieSiga: string | null
    }
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
  const [firmaModalOpen, setFirmaModalOpen] = useState(false)
  const [aceptandoTransferencia, setAceptandoTransferencia] = useState(false)

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

  const handleAceptarTransferencia = async () => {
    setAceptandoTransferencia(true)
    try {
      const response = await fetch(`/api/tramite/documentos/${id}/aceptar-transferencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observaciones: "" }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Transferencia aceptada correctamente")
        fetchDocumento()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al aceptar la transferencia")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al aceptar la transferencia")
    } finally {
      setAceptandoTransferencia(false)
    }
  }

  const [enviandoDocumento, setEnviandoDocumento] = useState(false)

  // Detectar firmas del historial
  const firmasDelHistorial = documento?.historial?.filter((h) => h.accion === "FIRMADO") || []
  const remitenteFirmo = firmasDelHistorial.some((h) => h.usuario && documento &&
    `${h.usuario.nombre} ${h.usuario.apellidos}` === `${documento.remitente.nombre} ${documento.remitente.apellidos}`)
  const esActaEntrega = documento?.tipoDocumento?.codigo === "ACTA-ENT"
  const esRemitente = documento?.remitente?.id === documento?.usuarioActual?.id
  const esDestinatarioDoc = documento?.destinos?.some(
    (d) => d.dependenciaDestinoId === documento?.usuarioActual?.dependenciaId
  ) || false
  const destinatarioFirmo = firmasDelHistorial.some((h) => !esRemitente || (h.usuario &&
    `${h.usuario.nombre} ${h.usuario.apellidos}` !== `${documento?.remitente?.nombre} ${documento?.remitente?.apellidos}`))
  const tieneTransferenciasPendientes = (documento?.transferencias?.some((t) => t.estado === "PENDIENTE")) || false

  const handleEnviarDocumento = async () => {
    setEnviandoDocumento(true)
    try {
      const response = await fetch(`/api/tramite/documentos/${id}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        toast.success("Documento firmado enviado correctamente al destinatario")
        fetchDocumento()
      } else {
        const error = await response.json()
        toast.error(error.message || "Error al enviar el documento")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al enviar el documento")
    } finally {
      setEnviandoDocumento(false)
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

          {/* Bienes Transferidos (para actas de entrega) */}
          {documento.transferencias && documento.transferencias.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Bienes Transferidos
                    </CardTitle>
                    <CardDescription>
                      {documento.transferencias.length} bien(es) en esta acta de entrega
                    </CardDescription>
                  </div>
                  {documento.transferencias.every((t) => t.estado === "ACEPTADA") ? (
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <PackageCheck className="h-3 w-3" />
                      Transferencia completada
                    </Badge>
                  ) : documento.transferencias.some((t) => t.estado === "PENDIENTE") ? (
                    <Badge className="bg-amber-100 text-amber-800 gap-1">
                      <Clock className="h-3 w-3" />
                      Pendiente de aceptación
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Serie</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documento.transferencias.map((t, idx) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{t.codigoPatrimonial}</TableCell>
                        <TableCell className="text-xs max-w-[200px]">
                          <span className="line-clamp-2">{t.descripcionBien || "-"}</span>
                        </TableCell>
                        <TableCell className="text-xs">{t.verificacion?.marcaSiga || "S/N"}</TableCell>
                        <TableCell className="text-xs">{t.verificacion?.modeloSiga || "S/N"}</TableCell>
                        <TableCell className="text-xs">{t.verificacion?.serieSiga || "S/N"}</TableCell>
                        <TableCell>
                          <Badge className={
                            t.estado === "ACEPTADA" ? "bg-green-100 text-green-800" :
                            t.estado === "RECHAZADA" ? "bg-red-100 text-red-800" :
                            "bg-amber-100 text-amber-800"
                          }>
                            {t.estado === "ACEPTADA" ? "Aceptado" :
                             t.estado === "RECHAZADA" ? "Rechazado" : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Botón aceptar transferencia - solo para destinatario con transferencias pendientes */}
                {documento.transferencias.some((t) => t.estado === "PENDIENTE") &&
                  documento.destinos.some(
                    (d) => d.dependenciaDestinoId === documento.usuarioActual.dependenciaId
                  ) && (
                    <div className={`mt-4 p-4 rounded-lg border-2 border-dashed ${destinatarioFirmo && documento.estado !== "BORRADOR" ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
                      {destinatarioFirmo && documento.estado !== "BORRADOR" ? (
                        <>
                          <p className="text-sm text-green-800 mb-3">
                            Al aceptar, confirmas que recibes los {documento.transferencias.filter(t => t.estado === "PENDIENTE").length} bien(es)
                            listados y quedan bajo tu responsabilidad.
                          </p>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={handleAceptarTransferencia}
                            disabled={aceptandoTransferencia}
                          >
                            {aceptandoTransferencia ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <PackageCheck className="mr-2 h-4 w-4" />
                            )}
                            {aceptandoTransferencia
                              ? "Procesando..."
                              : `Aceptar Transferencia (${documento.transferencias.filter(t => t.estado === "PENDIENTE").length} bienes)`}
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">
                              Firma digital requerida
                            </p>
                            <p className="text-sm text-amber-700 mt-1">
                              Debe firmar digitalmente el acta antes de aceptar la transferencia de los {documento.transferencias.filter(t => t.estado === "PENDIENTE").length} bien(es).
                              Use el botón &quot;Firmar Digitalmente&quot; en el panel de acciones.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
              {/* === FLUJO ACTA DE ENTREGA === */}
              {esActaEntrega ? (
                <>
                  {/* PASO 1: Remitente - Borrador sin firmar → Firmar */}
                  {documento.estado === "BORRADOR" && esRemitente && !remitenteFirmo && (
                    <>
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-2">
                        <AlertCircle className="inline h-4 w-4 mr-1" />
                        Debes firmar el acta antes de poder enviarla al destinatario.
                      </div>
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => setFirmaModalOpen(true)}
                        disabled={documento.archivosAdjuntos.length === 0}
                      >
                        <PenTool className="mr-2 h-4 w-4" />
                        Firmar Digitalmente
                      </Button>
                    </>
                  )}

                  {/* PASO 2: Remitente - Borrador firmado → Enviar */}
                  {documento.estado === "BORRADOR" && esRemitente && remitenteFirmo && (
                    <>
                      <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 mb-2">
                        <Shield className="inline h-4 w-4 mr-1" />
                        Documento firmado. Ahora puedes enviarlo al destinatario.
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleEnviarDocumento}
                        disabled={enviandoDocumento}
                      >
                        {enviandoDocumento ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        {enviandoDocumento ? "Enviando..." : "Enviar al Destinatario"}
                      </Button>
                    </>
                  )}

                  {/* PASO 3: Destinatario - Recibido, puede firmar */}
                  {documento.estado === "ENVIADO" && esDestinatarioDoc && (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => setFirmaModalOpen(true)}
                      disabled={documento.archivosAdjuntos.length === 0}
                    >
                      <PenTool className="mr-2 h-4 w-4" />
                      Firmar Digitalmente
                    </Button>
                  )}

                  {/* Remitente puede ver estado después de enviar */}
                  {documento.estado === "ENVIADO" && esRemitente && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      <Send className="inline h-4 w-4 mr-1" />
                      Acta enviada. Esperando firma y aceptación del destinatario.
                    </div>
                  )}

                  {/* Documento atendido/cerrado */}
                  {documento.estado === "ATENDIDO" && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
                      <PackageCheck className="inline h-4 w-4 mr-1" />
                      Transferencia completada. Todos los bienes fueron aceptados.
                    </div>
                  )}
                </>
              ) : (
                /* === FLUJO NORMAL (no acta) === */
                <>
                  {documento.estado === "BORRADOR" && (
                    <Button className="w-full" asChild>
                      <Link href={`/dashboard/tramite/editar/${documento.id}`}>
                        Editar Documento
                      </Link>
                    </Button>
                  )}

                  {/* Firma para documentos normales */}
                  {documento.tipoDocumento.requiereFirma &&
                    documento.estado !== "ARCHIVADO" &&
                    documento.archivosAdjuntos.length > 0 &&
                    (esRemitente || esDestinatarioDoc) && (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => setFirmaModalOpen(true)}
                      >
                        <PenTool className="mr-2 h-4 w-4" />
                        Firmar Digitalmente
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
                </>
              )}

              <Button variant="outline" className="w-full">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </CardContent>
          </Card>

          {/* Estado de firmas (para actas y documentos con firma) */}
          {documento.tipoDocumento.requiereFirma && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileSignature className="h-4 w-4" />
                  {esActaEntrega ? "Firmas del Acta" : "Firma Digital"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {esActaEntrega ? (
                  <>
                    {/* Firma remitente (ENTREGA) */}
                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${remitenteFirmo ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                      {remitenteFirmo ? (
                        <Shield className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${remitenteFirmo ? "text-green-800" : "text-gray-500"}`}>
                          ENTREGA — {documento.remitente.nombre} {documento.remitente.apellidos}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {remitenteFirmo ? "Firmado" : "Pendiente de firma"}
                        </p>
                      </div>
                    </div>
                    {/* Firma destinatario (RECIBE) */}
                    <div className={`flex items-center gap-2 p-2 rounded-lg border ${destinatarioFirmo && documento.estado !== "BORRADOR" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                      {destinatarioFirmo && documento.estado !== "BORRADOR" ? (
                        <Shield className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${destinatarioFirmo && documento.estado !== "BORRADOR" ? "text-green-800" : "text-gray-500"}`}>
                          RECIBE — {documento.transferencias?.[0]?.nombreDestinatario || "Destinatario"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {destinatarioFirmo && documento.estado !== "BORRADOR" ? "Firmado" : "Pendiente de firma"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {documento.archivoFirmadoUrl ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">Documento firmado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-800">Pendiente de firma</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

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

      {/* Modal de Firma Digital */}
      <FirmaModal
        isOpen={firmaModalOpen}
        onClose={() => setFirmaModalOpen(false)}
        archivos={documento.archivosAdjuntos.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          url: a.url,
        }))}
        onSuccess={() => {
          toast.success("Documento firmado digitalmente")
          setFirmaModalOpen(false)
          fetchDocumento()
        }}
      />
    </div>
  )
}
