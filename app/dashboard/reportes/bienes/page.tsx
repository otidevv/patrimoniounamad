"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  Building2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Package,
  PackageOpen,
  Search,
  Tag,
  User,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { exportMisBienesToExcel } from "@/lib/excel-export"

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
  medidas: string | null
  caracteristicas: string | null
  fecha_alta: string | null
  fecha_compra: string | null
  valor_compra: number | null
  valor_inicial: number | null
  valor_neto: number | null
  nombre_item: string | null
  codigo_barra: string | null
  centro_costo: string | null
  abreviatura: string | null
  observaciones: string | null
  proveedor: string | null
}

type TipoBusqueda = "codigo" | "serie" | "descripcion"

const PLACEHOLDERS: Record<TipoBusqueda, string> = {
  codigo: "Ej: 74221234000001",
  serie: "Ej: ABC123456",
  descripcion: "Ej: computadora, silla, impresora…",
}

export default function ReporteBienesPage() {
  const [tipo, setTipo] = useState<TipoBusqueda>("codigo")
  const [termino, setTermino] = useState("")
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [bienes, setBienes] = useState<BienPatrimonial[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bienSel, setBienSel] = useState<BienPatrimonial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [descargando, setDescargando] = useState(false)

  const money = (n: number | null) =>
    n === null || n === undefined
      ? "—"
      : new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: "PEN",
        }).format(n)

  const buscar = async () => {
    const q = termino.trim()
    if (!q || q.length < (tipo === "descripcion" ? 3 : 2)) {
      toast.error("Ingresa un término de búsqueda válido")
      return
    }
    setLoading(true)
    setError(null)
    setBuscado(true)
    setBienes([])
    try {
      const res = await fetch(
        `/api/patrimonio/buscar?${tipo}=${encodeURIComponent(q)}&limit=200`
      )
      const data = await res.json()
      if (res.status === 404) {
        setBienes([])
      } else if (!res.ok) {
        setError(data?.error || "Error al consultar SIGA")
      } else if (data.bien) {
        // Búsqueda por código: un solo resultado
        setBienes([data.bien])
        setBienSel(data.bien)
        setModalOpen(true)
      } else {
        setBienes(Array.isArray(data?.bienes) ? data.bienes : [])
      }
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }

  const verFicha = (bien: BienPatrimonial) => {
    setBienSel(bien)
    setModalOpen(true)
  }

  const descargarExcel = async () => {
    if (bienes.length === 0) return
    setDescargando(true)
    try {
      await exportMisBienesToExcel(bienes, null)
      toast.success(`Excel generado (${bienes.length} bienes)`)
    } catch {
      toast.error("Error al generar el Excel")
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
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-indigo-500 p-2.5 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ficha de Bien</h1>
            <p className="text-sm text-muted-foreground">
              Busca un bien patrimonial por código, número de serie o
              descripción y consulta su ficha completa en SIGA
            </p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Buscar por</label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoBusqueda)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="codigo">Código patrimonial</SelectItem>
                  <SelectItem value="serie">Número de serie</SelectItem>
                  <SelectItem value="descripcion">Descripción</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium leading-none">Término</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={PLACEHOLDERS[tipo]}
                  value={termino}
                  onChange={(e) => setTermino(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) buscar()
                  }}
                />
              </div>
            </div>
            <Button onClick={buscar} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estados */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Consultando SIGA…</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100">
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-900">
                No se pudo completar la búsqueda
              </p>
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && buscado && bienes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <PackageOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron bienes para «{termino}».
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados en tabla (serie / descripción) */}
      {!loading && !error && bienes.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {bienes.length} resultado{bienes.length === 1 ? "" : "s"}
              </p>
              <Button
                onClick={descargarExcel}
                disabled={descargando}
                variant="outline"
                className="gap-2"
              >
                {descargando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Excel
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="hidden md:table-cell">Marca</TableHead>
                    <TableHead className="hidden lg:table-cell">Serie</TableHead>
                    <TableHead className="text-right">Valor Neto</TableHead>
                    <TableHead className="text-right">Ficha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bienes.map((b, idx) => (
                    <TableRow
                      key={`${b.codigo_patrimonial}-${idx}`}
                      className="cursor-pointer"
                      onClick={() => verFicha(b)}
                    >
                      <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-indigo-700">
                        {b.codigo_patrimonial}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {b.descripcion}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {b.marca || "—"}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                        {b.serie || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">
                        {money(b.valor_neto)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            verFicha(b)
                          }}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado inicial */}
      {!buscado && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
            <Search className="h-7 w-7" />
          </div>
          <p className="max-w-sm text-sm">
            Elige un criterio e ingresa un término para buscar bienes
            patrimoniales en SIGA.
          </p>
        </div>
      )}

      {/* Modal ficha */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5 text-indigo-600" />
              <span className="font-mono">{bienSel?.codigo_patrimonial}</span>
            </DialogTitle>
          </DialogHeader>
          {bienSel && (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{bienSel.descripcion}</p>
                {bienSel.nombre_item && (
                  <Badge variant="outline" className="mt-1">
                    <Tag className="mr-1 h-3 w-3" />
                    {bienSel.nombre_item}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FichaVal label="Valor Compra" value={money(bienSel.valor_compra)} icon={DollarSign} />
                <FichaVal label="Valor Inicial" value={money(bienSel.valor_inicial)} icon={DollarSign} />
                <FichaVal label="Valor Neto" value={money(bienSel.valor_neto)} icon={DollarSign} accent />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FichaRow label="Marca" value={bienSel.marca} />
                <FichaRow label="Modelo" value={bienSel.modelo} />
                <FichaRow label="Serie" value={bienSel.serie} mono />
                <FichaRow label="Color" value={bienSel.color} />
                <FichaRow label="Medidas" value={bienSel.medidas} />
                <FichaRow label="Código de barra" value={bienSel.codigo_barra} mono />
                <FichaRow label="Dependencia" value={bienSel.nombre_depend} icon={Building2} />
                <FichaRow label="Sede" value={bienSel.nombre_sede} icon={MapPin} />
                <FichaRow label="Ubicación física" value={bienSel.ubicacion_fisica} icon={MapPin} />
                <FichaRow label="Responsable" value={bienSel.responsable} icon={User} />
                <FichaRow label="Usuario final" value={bienSel.usuario} icon={User} />
                <FichaRow label="Proveedor" value={bienSel.proveedor} />
                <FichaRow label="Fecha alta" value={bienSel.fecha_alta} icon={Calendar} />
                <FichaRow label="Fecha compra" value={bienSel.fecha_compra} icon={Calendar} />
              </div>

              {(bienSel.caracteristicas || bienSel.observaciones) && (
                <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                  {bienSel.caracteristicas && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Características
                      </p>
                      <p className="text-sm">{bienSel.caracteristicas}</p>
                    </div>
                  )}
                  {bienSel.observaciones && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Observaciones
                      </p>
                      <p className="text-sm">{bienSel.observaciones}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FichaVal({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 text-lg font-bold ${accent ? "text-emerald-600" : ""}`}
      >
        {value}
      </p>
    </div>
  )
}

function FichaRow({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string
  value: string | null
  icon?: React.ElementType
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className={`text-sm ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  )
}
