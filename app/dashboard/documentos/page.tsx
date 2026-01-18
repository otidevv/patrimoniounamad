"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Download,
  Loader2,
  FileSpreadsheet,
  FilePlus,
  Printer,
  ClipboardList,
  Building2,
  Calendar,
  Search,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"

interface Sesion {
  id: string
  codigo: string
  nombre: string
  estado: string
  fechaProgramada: string
  fechaInicio: string | null
  fechaFin: string | null
  totalVerificados: number
  totalEncontrados: number
  totalNoEncontrados: number
  dependencia: { id: string; nombre: string; siglas: string | null } | null
}

interface TipoDocumento {
  id: string
  nombre: string
  descripcion: string
  icono: React.ElementType
  categoria: string
}

const tiposDocumentos: TipoDocumento[] = [
  {
    id: "acta-inventario",
    nombre: "Acta de Inventario",
    descripcion: "Documento oficial que certifica el resultado del inventario físico",
    icono: ClipboardList,
    categoria: "inventario",
  },
  {
    id: "informe-faltantes",
    nombre: "Informe de Bienes Faltantes",
    descripcion: "Listado detallado de bienes no encontrados durante el inventario",
    icono: FileText,
    categoria: "inventario",
  },
  {
    id: "constancia-verificacion",
    nombre: "Constancia de Verificación",
    descripcion: "Documento que acredita la verificación de bienes por dependencia",
    icono: Building2,
    categoria: "inventario",
  },
  {
    id: "reporte-sesion",
    nombre: "Reporte de Sesión",
    descripcion: "Resumen completo de una sesión de inventario",
    icono: FileSpreadsheet,
    categoria: "inventario",
  },
]

export default function DocumentosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>("FINALIZADA")
  const [busqueda, setBusqueda] = useState("")
  const [generando, setGenerando] = useState<string | null>(null)

  useEffect(() => {
    fetchSesiones()
  }, [])

  const fetchSesiones = async () => {
    try {
      const response = await fetch("/api/inventario/sesiones?limit=100")
      if (response.ok) {
        const data = await response.json()
        setSesiones(data.sesiones || [])
      }
    } catch (error) {
      console.error("Error al cargar sesiones:", error)
    } finally {
      setLoading(false)
    }
  }

  const sesionesFiltradas = sesiones.filter((s) => {
    if (filtroEstado !== "all" && s.estado !== filtroEstado) return false
    if (busqueda) {
      const query = busqueda.toLowerCase()
      return (
        s.codigo.toLowerCase().includes(query) ||
        s.nombre.toLowerCase().includes(query) ||
        s.dependencia?.nombre.toLowerCase().includes(query)
      )
    }
    return true
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      PROGRAMADA: { variant: "secondary", label: "Programada" },
      EN_PROCESO: { variant: "default", label: "En Proceso" },
      PAUSADA: { variant: "outline", label: "Pausada" },
      FINALIZADA: { variant: "secondary", label: "Finalizada" },
      CANCELADA: { variant: "destructive", label: "Cancelada" },
    }
    const cfg = config[estado] || config.PROGRAMADA
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>
  }

  const generarDocumento = async (tipoDocumento: string, sesionId: string) => {
    setGenerando(`${tipoDocumento}-${sesionId}`)

    // Buscar la sesión
    const sesion = sesiones.find((s) => s.id === sesionId)
    if (!sesion) {
      setGenerando(null)
      return
    }

    // Generar contenido según el tipo de documento
    let contenido = ""
    let filename = ""

    switch (tipoDocumento) {
      case "acta-inventario":
        contenido = generarActaInventario(sesion)
        filename = `acta_inventario_${sesion.codigo}.txt`
        break
      case "informe-faltantes":
        contenido = generarInformeFaltantes(sesion)
        filename = `informe_faltantes_${sesion.codigo}.txt`
        break
      case "constancia-verificacion":
        contenido = generarConstanciaVerificacion(sesion)
        filename = `constancia_${sesion.codigo}.txt`
        break
      case "reporte-sesion":
        contenido = generarReporteSesion(sesion)
        filename = `reporte_sesion_${sesion.codigo}.csv`
        break
      default:
        setGenerando(null)
        return
    }

    // Descargar
    const blob = new Blob(["\ufeff" + contenido], { type: "text/plain;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()

    setGenerando(null)
  }

  const generarActaInventario = (sesion: Sesion) => {
    return `
================================================================================
                        UNIVERSIDAD NACIONAL AMAZÓNICA
                            DE MADRE DE DIOS
                      UNIDAD DE BIENES PATRIMONIALES
================================================================================

                          ACTA DE INVENTARIO FÍSICO

Código de Sesión: ${sesion.codigo}
Nombre: ${sesion.nombre}
Dependencia: ${sesion.dependencia?.nombre || "No especificada"}

Fecha Programada: ${formatDate(sesion.fechaProgramada)}
Fecha de Inicio: ${formatDate(sesion.fechaInicio)}
Fecha de Finalización: ${formatDate(sesion.fechaFin)}

--------------------------------------------------------------------------------
                              RESULTADOS
--------------------------------------------------------------------------------

Total de Bienes Verificados: ${sesion.totalVerificados}
Bienes Encontrados: ${sesion.totalEncontrados}
Bienes No Encontrados: ${sesion.totalNoEncontrados}

Porcentaje de Cumplimiento: ${
      sesion.totalVerificados > 0
        ? ((sesion.totalEncontrados / sesion.totalVerificados) * 100).toFixed(2)
        : 0
    }%

--------------------------------------------------------------------------------

En señal de conformidad con lo actuado, firman los intervinientes:


_______________________________          _______________________________
     Jefe de Patrimonio                       Responsable de Dependencia


                         _______________________________
                              Verificador Asignado


Fecha de emisión: ${new Date().toLocaleDateString("es-PE")}

================================================================================
                     SISTEMA DE GESTIÓN DE PATRIMONIO - UNAMAD
================================================================================
`.trim()
  }

  const generarInformeFaltantes = (sesion: Sesion) => {
    return `
================================================================================
                        UNIVERSIDAD NACIONAL AMAZÓNICA
                            DE MADRE DE DIOS
                      UNIDAD DE BIENES PATRIMONIALES
================================================================================

                      INFORME DE BIENES FALTANTES

Código de Sesión: ${sesion.codigo}
Dependencia: ${sesion.dependencia?.nombre || "No especificada"}
Fecha del Inventario: ${formatDate(sesion.fechaInicio)} - ${formatDate(sesion.fechaFin)}

--------------------------------------------------------------------------------
                              RESUMEN
--------------------------------------------------------------------------------

Total de Bienes No Encontrados: ${sesion.totalNoEncontrados}

NOTA: Para el detalle completo de los bienes faltantes, exportar desde el
módulo de Reportes de Inventario.

--------------------------------------------------------------------------------
                           OBSERVACIONES
--------------------------------------------------------------------------------

Se recomienda:
1. Verificar los traslados de bienes no documentados
2. Revisar si existen préstamos pendientes de regularizar
3. Coordinar con el responsable de la dependencia para ubicar los bienes

--------------------------------------------------------------------------------

Fecha de emisión: ${new Date().toLocaleDateString("es-PE")}

================================================================================
                     SISTEMA DE GESTIÓN DE PATRIMONIO - UNAMAD
================================================================================
`.trim()
  }

  const generarConstanciaVerificacion = (sesion: Sesion) => {
    return `
================================================================================
                        UNIVERSIDAD NACIONAL AMAZÓNICA
                            DE MADRE DE DIOS
                      UNIDAD DE BIENES PATRIMONIALES
================================================================================

                      CONSTANCIA DE VERIFICACIÓN

La Unidad de Bienes Patrimoniales de la Universidad Nacional Amazónica de
Madre de Dios, deja constancia que:

Se ha realizado la verificación física de los bienes patrimoniales asignados a:

DEPENDENCIA: ${sesion.dependencia?.nombre || "No especificada"}

Según Sesión de Inventario: ${sesion.codigo}
Nombre de la Sesión: ${sesion.nombre}

--------------------------------------------------------------------------------
                              RESULTADO
--------------------------------------------------------------------------------

Estado de la Sesión: ${sesion.estado}
Total Bienes Verificados: ${sesion.totalVerificados}
Bienes Encontrados: ${sesion.totalEncontrados}
Bienes No Encontrados: ${sesion.totalNoEncontrados}

--------------------------------------------------------------------------------

Se expide la presente constancia a solicitud del interesado para los fines
que estime conveniente.

Puerto Maldonado, ${new Date().toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}


                         _______________________________
                           Jefe de Bienes Patrimoniales
                                    UNAMAD

================================================================================
                     SISTEMA DE GESTIÓN DE PATRIMONIO - UNAMAD
================================================================================
`.trim()
  }

  const generarReporteSesion = (sesion: Sesion) => {
    let csv = "REPORTE DE SESIÓN DE INVENTARIO\n"
    csv += `Fecha de generación,${new Date().toLocaleString("es-PE")}\n\n`
    csv += "DATOS DE LA SESIÓN\n"
    csv += `Código,${sesion.codigo}\n`
    csv += `Nombre,${sesion.nombre}\n`
    csv += `Estado,${sesion.estado}\n`
    csv += `Dependencia,${sesion.dependencia?.nombre || "No especificada"}\n`
    csv += `Fecha Programada,${formatDate(sesion.fechaProgramada)}\n`
    csv += `Fecha Inicio,${formatDate(sesion.fechaInicio)}\n`
    csv += `Fecha Fin,${formatDate(sesion.fechaFin)}\n\n`
    csv += "RESULTADOS\n"
    csv += `Total Verificados,${sesion.totalVerificados}\n`
    csv += `Encontrados,${sesion.totalEncontrados}\n`
    csv += `No Encontrados,${sesion.totalNoEncontrados}\n`
    csv += `Porcentaje Cumplimiento,${
      sesion.totalVerificados > 0
        ? ((sesion.totalEncontrados / sesion.totalVerificados) * 100).toFixed(2)
        : 0
    }%\n`
    return csv
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generador de Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Genera documentos oficiales a partir de las sesiones de inventario
          </p>
        </div>
      </div>

      {/* Tipos de Documentos Disponibles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiposDocumentos.map((tipo) => (
          <Card key={tipo.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <tipo.icono className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-sm">{tipo.nombre}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{tipo.descripcion}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Seleccionar Sesión
          </CardTitle>
          <CardDescription>
            Filtra y selecciona una sesión para generar documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="sr-only">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nombre o dependencia..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label className="sr-only">Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="FINALIZADA">Finalizadas</SelectItem>
                  <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                  <SelectItem value="PROGRAMADA">Programadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Sesiones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Sesiones Disponibles ({sesionesFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">Dependencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                    <TableHead className="text-center">Verificados</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sesionesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No hay sesiones disponibles con los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    sesionesFiltradas.slice(0, 20).map((sesion) => (
                      <TableRow key={sesion.id}>
                        <TableCell className="font-mono text-xs">{sesion.codigo}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{sesion.nombre}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {sesion.dependencia?.siglas || sesion.dependencia?.nombre || "—"}
                        </TableCell>
                        <TableCell>{getEstadoBadge(sesion.estado)}</TableCell>
                        <TableCell className="hidden lg:table-cell whitespace-nowrap">
                          {formatDate(sesion.fechaProgramada)}
                        </TableCell>
                        <TableCell className="text-center">{sesion.totalVerificados}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Acta de Inventario"
                              disabled={generando !== null}
                              onClick={() => generarDocumento("acta-inventario", sesion.id)}
                            >
                              {generando === `acta-inventario-${sesion.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reporte CSV"
                              disabled={generando !== null}
                              onClick={() => generarDocumento("reporte-sesion", sesion.id)}
                            >
                              {generando === `reporte-sesion-${sesion.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ayuda */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Documentos Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Acta de Inventario</p>
                <p className="text-xs text-muted-foreground">
                  Documento oficial con los resultados del inventario, listo para firma
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <Download className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Reporte CSV</p>
                <p className="text-xs text-muted-foreground">
                  Datos de la sesión en formato CSV para análisis en Excel
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
