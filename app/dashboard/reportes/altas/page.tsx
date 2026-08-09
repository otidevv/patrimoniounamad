"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  PackagePlus,
  PackageOpen,
  Search,
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
import { exportMisBienesToExcel } from "@/lib/excel-export"

interface BienPatrimonial {
  codigo_patrimonial: string
  descripcion: string
  nombre_sede: string | null
  nombre_depend: string | null
  ubicacion_fisica: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
  color: string | null
  fecha_alta: string | null
  fecha_compra: string | null
  valor_compra: number | null
  valor_neto: number | null
  abreviatura: string | null
}

function isoHoy() {
  return new Date().toISOString().split("T")[0]
}
function isoInicioAnio() {
  return `${new Date().getFullYear()}-01-01`
}

export default function ReporteAltasPage() {
  const [desde, setDesde] = useState(isoInicioAnio())
  const [hasta, setHasta] = useState(isoHoy())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bienes, setBienes] = useState<BienPatrimonial[]>([])
  const [valorCompraTotal, setValorCompraTotal] = useState(0)
  const [valorNetoTotal, setValorNetoTotal] = useState(0)
  const [filtro, setFiltro] = useState("")
  const [descargando, setDescargando] = useState(false)

  const money = (n: number | null) =>
    n === null || n === undefined
      ? "—"
      : new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: "PEN",
        }).format(n)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/reportes/altas?desde=${desde}&hasta=${hasta}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Error al cargar el reporte")
        setBienes([])
        return
      }
      setBienes(Array.isArray(data?.bienes) ? data.bienes : [])
      setValorCompraTotal(data?.valorCompraTotal || 0)
      setValorNetoTotal(data?.valorNetoTotal || 0)
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  const aplicarPreset = (preset: "esteAnio" | "anioAnterior" | "esteMes") => {
    const now = new Date()
    if (preset === "esteAnio") {
      setDesde(`${now.getFullYear()}-01-01`)
      setHasta(isoHoy())
    } else if (preset === "anioAnterior") {
      const y = now.getFullYear() - 1
      setDesde(`${y}-01-01`)
      setHasta(`${y}-12-31`)
    } else {
      const m = String(now.getMonth() + 1).padStart(2, "0")
      setDesde(`${now.getFullYear()}-${m}-01`)
      setHasta(isoHoy())
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
        (b.nombre_depend || "").toLowerCase().includes(q)
    )
  }, [bienes, filtro])

  const descargarExcel = async () => {
    if (bienesFiltrados.length === 0) {
      toast.error("No hay altas para exportar")
      return
    }
    setDescargando(true)
    try {
      await exportMisBienesToExcel(bienesFiltrados, {
        nombre: `Altas del ${desde} al ${hasta}`,
        documento: "—",
      })
      toast.success(`Excel generado (${bienesFiltrados.length} altas)`)
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
          <div className="rounded-lg bg-teal-600 p-2.5 text-white">
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Altas de Bienes
            </h1>
            <p className="text-sm text-muted-foreground">
              Bienes incorporados al patrimonio (fecha de alta en SIGA) dentro de
              un rango de fechas
            </p>
          </div>
        </div>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Desde</label>
                <Input
                  type="date"
                  value={desde}
                  max={hasta}
                  onChange={(e) => setDesde(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Hasta</label>
                <Input
                  type="date"
                  value={hasta}
                  min={desde}
                  max={isoHoy()}
                  onChange={(e) => setHasta(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
              <Button onClick={cargar} disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Consultar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => aplicarPreset("esteMes")}>
                Este mes
              </Button>
              <Button variant="outline" size="sm" onClick={() => aplicarPreset("esteAnio")}>
                Este año
              </Button>
              <Button variant="outline" size="sm" onClick={() => aplicarPreset("anioAnterior")}>
                Año anterior
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PackagePlus className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Altas en el periodo
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold">
                {bienes.length.toLocaleString("es-PE")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Valor de compra
                </span>
              </div>
              <p className="mt-1 text-xl font-bold">{money(valorCompraTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Valor neto actual
                </span>
              </div>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {money(valorNetoTotal)}
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
      ) : bienes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <PackageOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Sin altas en el periodo</p>
              <p className="text-sm text-muted-foreground">
                No se registraron incorporaciones entre {desde} y {hasta}.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
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
                className="shrink-0 gap-2 bg-teal-600 hover:bg-teal-700"
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
                    <TableHead>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Fecha Alta
                      </span>
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Dependencia
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Valor Compra</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Valor Neto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bienesFiltrados.map((b, idx) => (
                    <TableRow key={`${b.codigo_patrimonial}-${idx}`}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {b.fecha_alta || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-teal-700">
                        {b.codigo_patrimonial}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {b.descripcion}
                      </TableCell>
                      <TableCell className="hidden max-w-[200px] truncate text-sm text-muted-foreground lg:table-cell">
                        {b.abreviatura || b.nombre_depend || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {money(b.valor_compra)}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-right font-medium tabular-nums text-emerald-700 sm:table-cell">
                        {money(b.valor_neto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              {filtro
                ? `Mostrando ${bienesFiltrados.length} de ${bienes.length} altas`
                : `${bienes.length} alta${bienes.length === 1 ? "" : "s"} en el periodo`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
