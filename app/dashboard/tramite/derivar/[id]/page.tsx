"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Send, FileText, Building2, User, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface TipoDocumento {
  id: string
  nombre: string
  codigo: string
}

interface Documento {
  id: string
  numeroDocumento: string
  asunto: string
  contenido: string
  estado: string
  tipoDocumento: TipoDocumento
  remitente?: {
    nombre: string
    apellidos: string
    dependencia?: {
      nombre: string
      siglas: string
    }
  }
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

export default function DerivarDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [documento, setDocumento] = useState<Documento | null>(null)
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    dependenciaDestinoId: "",
    destinatarioId: "",
    observaciones: "",
  })

  useEffect(() => {
    fetchDocumento()
    fetchDependencias()
  }, [resolvedParams.id])

  useEffect(() => {
    if (formData.dependenciaDestinoId) {
      fetchUsuariosDependencia(formData.dependenciaDestinoId)
    } else {
      setUsuarios([])
      setFormData(prev => ({ ...prev, destinatarioId: "" }))
    }
  }, [formData.dependenciaDestinoId])

  const fetchDocumento = async () => {
    try {
      const res = await fetch(`/api/tramite/documentos/${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setDocumento(data)
      } else {
        setError("No se pudo cargar el documento")
      }
    } catch {
      setError("Error al cargar el documento")
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
    } catch {
      console.error("Error al cargar dependencias")
    }
  }

  const fetchUsuariosDependencia = async (dependenciaId: string) => {
    try {
      const res = await fetch(`/api/tramite/usuarios-dependencia?dependenciaId=${dependenciaId}`)
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data)
      }
    } catch {
      console.error("Error al cargar usuarios")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.dependenciaDestinoId) {
      setError("Debe seleccionar una dependencia destino")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/tramite/derivar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentoId: resolvedParams.id,
          dependenciaDestinoId: formData.dependenciaDestinoId,
          destinatarioId: formData.destinatarioId || null,
          observaciones: formData.observaciones,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push(`/dashboard/tramite/documento/${resolvedParams.id}`)
      } else {
        setError(data.message || "Error al derivar el documento")
      }
    } catch {
      setError("Error de conexión al derivar el documento")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!documento) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Documento no encontrado</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/dashboard/tramite/entrada">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Bandeja
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/tramite/documento/${resolvedParams.id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Derivar Documento</h1>
          <p className="text-muted-foreground">
            Enviar documento a otra dependencia
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Información del documento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documento a Derivar
            </CardTitle>
            <CardDescription>
              Información del documento que será derivado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Número</Label>
              <p className="font-medium">{documento.numeroDocumento}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tipo</Label>
              <p className="font-medium">{documento.tipoDocumento.nombre}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Asunto</Label>
              <p className="font-medium">{documento.asunto}</p>
            </div>
            {documento.remitente && (
              <div>
                <Label className="text-muted-foreground">Remitente</Label>
                <p className="font-medium">
                  {documento.remitente.nombre} {documento.remitente.apellidos}
                </p>
                {documento.remitente.dependencia && (
                  <p className="text-sm text-muted-foreground">
                    {documento.remitente.dependencia.nombre}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Estado Actual</Label>
              <p className="font-medium">{documento.estado}</p>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de derivación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Datos de Derivación
            </CardTitle>
            <CardDescription>
              Seleccione el destino del documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="dependencia" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Dependencia Destino *
                </Label>
                <Select
                  value={formData.dependenciaDestinoId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dependenciaDestinoId: value, destinatarioId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una dependencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {dependencias.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {dep.siglas} - {dep.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinatario" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Destinatario (Opcional)
                </Label>
                <Select
                  value={formData.destinatarioId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, destinatarioId: value })
                  }
                  disabled={!formData.dependenciaDestinoId || usuarios.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !formData.dependenciaDestinoId
                        ? "Seleccione primero una dependencia"
                        : usuarios.length === 0
                        ? "No hay usuarios en esta dependencia"
                        : "Seleccione un destinatario"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nombre} {user.apellidos}
                        {user.cargo && ` - ${user.cargo}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Si no selecciona un destinatario, el documento será visible para todos los usuarios de la dependencia
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, observaciones: e.target.value })
                  }
                  placeholder="Agregue observaciones o instrucciones para el destinatario..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || !formData.dependenciaDestinoId}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Derivando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Derivar Documento
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
