"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  MapPin,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DepResumen {
  dep_id: string
  dep_nombre: string
  total_bienes: number
  valor_neto: number
}

interface SedeResumen {
  sede_id: string
  sede_nombre: string
  total_bienes: number
  valor_neto: number
  dependencias: DepResumen[]
}

interface Totales {
  total_bienes: number
  valor_neto: number
}

export default function ReporteSedesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sedes, setSedes] = useState<SedeResumen[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const money = (n: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(n || 0)

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/reportes/por-sede")
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error || "Error al cargar el reporte")
          return
        }
        const listaSedes: SedeResumen[] = Array.isArray(data?.sedes)
          ? data.sedes
          : []
        setSedes(listaSedes)
        setTotales(data?.totales ?? null)
        // Expandir la primera sede por defecto
        if (listaSedes.length > 0) {
          setExpandidas(new Set([listaSedes[0].sede_id]))
        }
      } catch {
        setError("Error de conexión al servidor")
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const toggle = (sedeId: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(sedeId)) next.delete(sedeId)
      else next.add(sedeId)
      return next
    })
  }

  const exportarExcel = () => {
    if (sedes.length === 0) {
      toast.error("No hay datos para exportar")
      return
    }
    try {
      const filas: Record<string, unknown>[] = []
      sedes.forEach((s) => {
        s.dependencias.forEach((d) => {
          filas.push({
            Sede: s.sede_nombre,
            Dependencia: d.dep_nombre,
            "N° Bienes": d.total_bienes,
            "Valor Neto (S/)": Number(d.valor_neto.toFixed(2)),
          })
        })
      })
      if (totales) {
        filas.push({
          Sede: "TOTAL",
          Dependencia: "",
          "N° Bienes": totales.total_bienes,
          "Valor Neto (S/)": Number(totales.valor_neto.toFixed(2)),
        })
      }
      const ws = XLSX.utils.json_to_sheet(filas)
      ws["!cols"] = [{ wch: 38 }, { wch: 42 }, { wch: 12 }, { wch: 18 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Bienes por Sede")
      const fecha = new Date().toISOString().split("T")[0]
      XLSX.writeFile(wb, `bienes_por_sede_${fecha}.xlsx`)
      toast.success("Excel generado correctamente")
    } catch {
      toast.error("Error al generar el Excel")
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500 p-2.5 text-white">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Bienes por Sede
              </h1>
              <p className="text-sm text-muted-foreground">
                Distribución de bienes y valor neto por sede, con desglose por
                dependencia (datos de SIGA)
              </p>
            </div>
          </div>
          <Button
            onClick={exportarExcel}
            disabled={loading || sedes.length === 0}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Resumen */}
      {totales && !loading && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Sedes
                </span>
              </div>
              <p className="mt-1 text-2xl font-bold">{sedes.length}</p>
            </CardContent>
          </Card>
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
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Valor neto total
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
        <div className="space-y-3">
          {sedes.map((sede) => {
            const abierta = expandidas.has(sede.sede_id)
            return (
              <Card key={sede.sede_id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(sede.sede_id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40"
                >
                  {abierta ? (
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{sede.sede_nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {sede.dependencias.length} dependencias ·{" "}
                      {sede.total_bienes.toLocaleString("es-PE")} bienes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">
                      {money(sede.valor_neto)}
                    </p>
                    <p className="text-xs text-muted-foreground">valor neto</p>
                  </div>
                </button>

                {abierta && (
                  <div className="border-t">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">N°</TableHead>
                            <TableHead>Dependencia</TableHead>
                            <TableHead className="text-right">
                              N° Bienes
                            </TableHead>
                            <TableHead className="text-right">
                              Valor Neto
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sede.dependencias.map((d, idx) => (
                            <TableRow key={`${d.dep_id}-${idx}`}>
                              <TableCell className="text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  {d.dep_nombre}
                                </span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {d.total_bienes.toLocaleString("es-PE")}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums text-emerald-700">
                                {money(d.valor_neto)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
