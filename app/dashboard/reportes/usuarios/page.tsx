"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  Building2,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Package,
  PackageOpen,
  Search,
  User,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { exportMisBienesToExcel } from "@/lib/excel-export"

// ─── Interfaces ───
interface BienPatrimonial {
  codigo_patrimonial: string
  descripcion: string
  nombre_sede: string | null
  nombre_depend: string | null
  responsable: string | null
  usuario: string | null
  ubicacion_fisica: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
  color: string | null
  fecha_alta: string | null
  valor_compra: number | null
  valor_neto: number | null
  abreviatura: string | null
}

interface PersonaInfo {
  usuarioId: string | null
  nombre: string
  apellidos: string
  cargo: string | null
  email: string | null
  dependencia: { id: string; nombre: string; siglas: string | null } | null
  sede: { id: string; nombre: string } | null
  activo: boolean | null
}

export default function ReporteUsuarioPage() {
  const [dni, setDni] = useState("")
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [dniConsultado, setDniConsultado] = useState("")
  const [persona, setPersona] = useState<PersonaInfo | null>(null)
  const [origen, setOrigen] = useState<string | null>(null)
  const [bienes, setBienes] = useState<BienPatrimonial[]>([])
  const [error, setError] = useState<string | null>(null)
  const [descargando, setDescargando] = useState(false)
  const [filtro, setFiltro] = useState("")

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—"
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value)
  }

  const buscar = async () => {
    const doc = dni.trim()
    if (!/^\d{8,12}$/.test(doc)) {
      toast.error("Ingresa un número de documento válido (mínimo 8 dígitos)")
      return
    }

    setLoading(true)
    setError(null)
    setBuscado(true)
    setDniConsultado(doc)
    setPersona(null)
    setOrigen(null)
    setBienes([])
    setFiltro("")

    try {
      const [resPersona, resBienes] = await Promise.all([
        fetch(`/api/usuarios/buscar-documento?documento=${doc}&tipo=DNI`),
        fetch(`/api/patrimonio/buscar?documento=${doc}&limit=500`),
      ])

      const dataBienes = await resBienes.json()
      if (!resBienes.ok) {
        setError(dataBienes?.error || "No se pudo consultar SIGA")
      } else {
        setBienes(Array.isArray(dataBienes?.bienes) ? dataBienes.bienes : [])
      }

      const dataPersona = await resPersona.json()
      if (resPersona.ok && dataPersona?.encontrado && dataPersona?.datos) {
        setPersona(dataPersona.datos)
        setOrigen(dataPersona.origen)
      }
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }

  const bienesFiltrados = useMemo(() => {
    if (!filtro) return bienes
    const q = filtro.toLowerCase()
    return bienes.filter(
      (b) =>
        b.codigo_patrimonial.toLowerCase().includes(q) ||
        b.descripcion.toLowerCase().includes(q) ||
        (b.marca || "").toLowerCase().includes(q) ||
        (b.serie || "").toLowerCase().includes(q) ||
        (b.ubicacion_fisica || "").toLowerCase().includes(q)
    )
  }, [bienes, filtro])

  const valorTotal = useMemo(
    () => bienes.reduce((acc, b) => acc + (b.valor_neto || 0), 0),
    [bienes]
  )

  // Nombre a mostrar / usar en el Excel: prioriza el usuario del sistema,
  // si no, cae al nombre que reporta SIGA (responsable o usuario final).
  const nombreMostrado = useMemo(() => {
    if (persona) return `${persona.nombre} ${persona.apellidos}`.trim()
    const primero = bienes[0]
    return primero?.usuario || primero?.responsable || null
  }, [persona, bienes])

  const descargarExcel = async () => {
    if (bienesFiltrados.length === 0) {
      toast.error("No hay bienes para exportar")
      return
    }
    setDescargando(true)
    try {
      await exportMisBienesToExcel(bienesFiltrados, {
        nombre: nombreMostrado || "Sin nombre",
        documento: dniConsultado,
      })
      toast.success(
        `Excel generado (${bienesFiltrados.length} bien${
          bienesFiltrados.length === 1 ? "" : "es"
        })`
      )
    } catch {
      toast.error("Error al generar el archivo Excel")
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/reportes"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Reportes
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500 p-2.5 text-white">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Reporte por Usuario
              </h1>
              <p className="text-sm text-muted-foreground">
                Ingresa un número de DNI para consultar los bienes patrimoniales
                que tiene asignados actualmente en SIGA
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label
                htmlFor="dni"
                className="text-sm font-medium leading-none"
              >
                Número de DNI
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dni"
                  inputMode="numeric"
                  placeholder="Ej: 40297687"
                  className="pl-9"
                  value={dni}
                  maxLength={12}
                  onChange={(e) =>
                    setDni(e.target.value.replace(/[^\d]/g, ""))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) buscar()
                  }}
                />
              </div>
            </div>
            <Button
              onClick={buscar}
              disabled={loading}
              className="gap-2 sm:w-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar bienes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Consultando SIGA…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100">
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-900">
                No se pudo completar la consulta
              </p>
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {!loading && !error && buscado && (
        <>
          {/* Ficha de la persona + estadísticas */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold">
                        {nombreMostrado || "Persona no identificada"}
                      </p>
                      {origen === "sistema" && (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          Usuario del sistema
                        </Badge>
                      )}
                      {origen === "reniec" && (
                        <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                          RENIEC
                        </Badge>
                      )}
                      {!persona && (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700"
                        >
                          No registrado en el sistema
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      DNI {dniConsultado}
                      {persona?.cargo ? ` · ${persona.cargo}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {persona?.dependencia && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {persona.dependencia.siglas ||
                            persona.dependencia.nombre}
                        </span>
                      )}
                      {persona?.sede && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {persona.sede.nombre}
                        </span>
                      )}
                      {!persona && bienes[0]?.nombre_depend && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {bienes[0].nombre_depend}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Bienes asignados
                    </span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{bienes.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Valor neto total
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-bold text-emerald-600">
                    {formatCurrency(valorTotal)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabla de bienes */}
          {bienes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                  <PackageOpen className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Sin bienes asignados</p>
                  <p className="text-sm text-muted-foreground">
                    El DNI {dniConsultado} no tiene bienes patrimoniales
                    registrados a su nombre en SIGA.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                {/* Barra de acciones */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar en los resultados…"
                      className="pl-9"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={descargarExcel}
                    disabled={descargando || bienesFiltrados.length === 0}
                    className="shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {descargando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Descargar Excel
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">N°</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Marca / Modelo
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Ubicación
                        </TableHead>
                        <TableHead className="text-right">Valor Neto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bienesFiltrados.map((bien, idx) => (
                        <TableRow key={`${bien.codigo_patrimonial}-${idx}`}>
                          <TableCell className="text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-blue-700">
                            <span className="inline-flex items-center gap-1.5">
                              <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                              {bien.codigo_patrimonial}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[260px] truncate">
                            {bien.descripcion}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {[bien.marca, bien.modelo]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </TableCell>
                          <TableCell className="hidden max-w-[200px] truncate text-sm text-muted-foreground lg:table-cell">
                            {bien.ubicacion_fisica || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium">
                            {formatCurrency(bien.valor_neto)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {filtro
                    ? `Mostrando ${bienesFiltrados.length} de ${bienes.length} bienes`
                    : `${bienes.length} bien${bienes.length === 1 ? "" : "es"} en total`}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Estado inicial (sin búsqueda) */}
      {!buscado && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
            <Search className="h-7 w-7" />
          </div>
          <p className="max-w-sm text-sm">
            Ingresa un número de DNI en el buscador para ver los bienes
            patrimoniales asignados a esa persona.
          </p>
        </div>
      )}
    </div>
  )
}
