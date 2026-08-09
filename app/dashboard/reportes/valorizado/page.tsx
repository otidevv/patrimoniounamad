"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  DollarSign,
  Download,
  Loader2,
  MapPin,
  Package,
  Search,
  TrendingDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface Grupo {
  grupo_id: string
  grupo_nombre: string
  abreviatura: string | null
  total_bienes: number
  valor_compra: number
  valor_inicial: number
  depreciacion: number
  valor_neto: number
}

interface Totales {
  total_bienes: number
  valor_compra: number
  valor_inicial: number
  depreciacion: number
  valor_neto: number
}

type Agrupacion = "dependencia" | "sede"

export default function ReporteValorizadoPage() {
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("dependencia")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [filtro, setFiltro] = useState("")

  const money = (n: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(n || 0)

  const pct = (dep: number, base: number) =>
    base > 0 ? `${((dep / base) * 100).toFixed(1)}%` : "—"

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reportes/valorizado?agrupar=${agrupacion}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Error al cargar el reporte")
        setGrupos([])
        setTotales(null)
        return
      }
      setGrupos(Array.isArray(data?.grupos) ? data.grupos : [])
      setTotales(data?.totales ?? null)
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }, [agrupacion])

  useEffect(() => {
    cargar()
  }, [cargar])

  const gruposFiltrados = useMemo(() => {
    if (!filtro) return grupos
    const q = filtro.toLowerCase()
    return grupos.filter(
      (g) =>
        g.grupo_nombre.toLowerCase().includes(q) ||
        (g.abreviatura || "").toLowerCase().includes(q)
    )
  }, [grupos, filtro])

  const etiquetaGrupo = agrupacion === "sede" ? "Sede" : "Dependencia"

  const exportarExcel = () => {
    if (grupos.length === 0) {
      toast.error("No hay datos para exportar")
      return
    }
    try {
      const filas = grupos.map((g, i) => ({
        "N°": i + 1,
        [etiquetaGrupo]: g.grupo_nombre,
        Siglas: g.abreviatura || "",
        "N° Bienes": g.total_bienes,
        "Valor Compra (S/)": Number(g.valor_compra.toFixed(2)),
        "Valor Inicial (S/)": Number(g.valor_inicial.toFixed(2)),
        "Depreciación (S/)": Number(g.depreciacion.toFixed(2)),
        "Valor Neto (S/)": Number(g.valor_neto.toFixed(2)),
        "% Depreciado":
          g.valor_inicial > 0
            ? Number(((g.depreciacion / g.valor_inicial) * 100).toFixed(1))
            : 0,
      }))
      if (totales) {
        filas.push({
          "N°": "" as unknown as number,
          [etiquetaGrupo]: "TOTAL",
          Siglas: "",
          "N° Bienes": totales.total_bienes,
          "Valor Compra (S/)": Number(totales.valor_compra.toFixed(2)),
          "Valor Inicial (S/)": Number(totales.valor_inicial.toFixed(2)),
          "Depreciación (S/)": Number(totales.depreciacion.toFixed(2)),
          "Valor Neto (S/)": Number(totales.valor_neto.toFixed(2)),
          "% Depreciado":
            totales.valor_inicial > 0
              ? Number(
                  ((totales.depreciacion / totales.valor_inicial) * 100).toFixed(1)
                )
              : 0,
        })
      }
      const ws = XLSX.utils.json_to_sheet(filas)
      ws["!cols"] = [
        { wch: 5 },
        { wch: 42 },
        { wch: 12 },
        { wch: 10 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 13 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Valorizado")
      const fecha = new Date().toISOString().split("T")[0]
      XLSX.writeFile(wb, `inventario_valorizado_${agrupacion}_${fecha}.xlsx`)
      toast.success("Excel generado correctamente")
    } catch {
      toast.error("Error al generar el Excel")
    }
  }

  const pctDeprecTotal =
    totales && totales.valor_inicial > 0
      ? (totales.depreciacion / totales.valor_inicial) * 100
      : 0

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-600 p-2.5 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Inventario Valorizado
              </h1>
              <p className="text-sm text-muted-foreground">
                Valor de compra, valor inicial, depreciación acumulada y valor
                neto de los bienes activos en SIGA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={agrupacion}
              onValueChange={(v) => setAgrupacion(v as Agrupacion)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dependencia">Por Dependencia</SelectItem>
                <SelectItem value="sede">Por Sede</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={exportarExcel}
              disabled={loading || grupos.length === 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjetas resumen */}
      {totales && !loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Bienes activos
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold">
                {totales.total_bienes.toLocaleString("es-PE")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Valor inicial
                </span>
              </div>
              <p className="mt-1 text-xl font-bold">
                {money(totales.valor_inicial)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Depreciación
                </span>
              </div>
              <p className="mt-1 text-xl font-bold text-rose-600">
                {money(totales.depreciacion)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pctDeprecTotal.toFixed(1)}% del valor inicial
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Valor neto
                </span>
              </div>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {money(totales.valor_neto)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Consultando SIGA…</p>
          </div>
        </div>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-100">
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-900">
                No se pudo cargar el reporte
              </p>
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Filtrar ${etiquetaGrupo.toLowerCase()}…`}
                className="pl-9"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">N°</TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-1.5">
                        {agrupacion === "sede" ? (
                          <MapPin className="h-3.5 w-3.5" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5" />
                        )}
                        {etiquetaGrupo}
                      </span>
                    </TableHead>
                    <TableHead className="text-right">N° Bienes</TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      Valor Inicial
                    </TableHead>
                    <TableHead className="hidden text-right lg:table-cell">
                      Depreciación
                    </TableHead>
                    <TableHead className="text-right">Valor Neto</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      % Deprec.
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gruposFiltrados.map((g, idx) => (
                    <TableRow key={`${g.grupo_id}-${idx}`}>
                      <TableCell className="text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <div className="truncate font-medium" title={g.grupo_nombre}>
                          {g.grupo_nombre}
                        </div>
                        {g.abreviatura && (
                          <div className="text-xs text-muted-foreground">
                            {g.abreviatura}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.total_bienes.toLocaleString("es-PE")}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {money(g.valor_inicial)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-rose-600 lg:table-cell">
                        {money(g.depreciacion)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-emerald-700">
                        {money(g.valor_neto)}
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                        {pct(g.depreciacion, g.valor_inicial)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {filtro
                ? `Mostrando ${gruposFiltrados.length} de ${grupos.length} ${etiquetaGrupo.toLowerCase()}s`
                : `${grupos.length} ${etiquetaGrupo.toLowerCase()}${grupos.length === 1 ? "" : "s"} en total`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
