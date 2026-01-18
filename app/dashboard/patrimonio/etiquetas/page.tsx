"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Barcode from "react-barcode"
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  Printer,
  Package,
  Tag,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

interface BienPatrimonial {
  codigo_patrimonial: string
  descripcion: string
  nombre_sede: string | null
  nombre_depend: string | null
  responsable: string | null
  ubicacion_fisica: string | null
  marca: string | null
  modelo: string | null
  abreviatura: string | null
}

type TamanoEtiqueta = "pequena" | "mediana" | "grande"

const tamanos: Record<TamanoEtiqueta, { width: number; height: number; label: string }> = {
  pequena: { width: 50, height: 25, label: "Pequeña (50x25mm)" },
  mediana: { width: 70, height: 35, label: "Mediana (70x35mm)" },
  grande: { width: 100, height: 50, label: "Grande (100x50mm)" },
}

export default function EtiquetasPage() {
  const [busqueda, setBusqueda] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultados, setResultados] = useState<BienPatrimonial[]>([])
  const [seleccionados, setSeleccionados] = useState<BienPatrimonial[]>([])
  const [tamano, setTamano] = useState<TamanoEtiqueta>("mediana")
  const printRef = useRef<HTMLDivElement>(null)

  const buscar = async () => {
    if (!busqueda.trim()) return

    setLoading(true)
    setError(null)
    setResultados([])

    try {
      // Determinar si es código o descripción
      const isCode = /^\d+$/.test(busqueda.trim())
      const param = isCode ? "codigo" : "descripcion"

      const response = await fetch(
        `/api/patrimonio/buscar?${param}=${encodeURIComponent(busqueda.trim())}`
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al buscar")
        return
      }

      if (isCode && data.bien) {
        setResultados([data.bien])
      } else if (data.bienes) {
        setResultados(data.bienes)
      }
    } catch {
      setError("Error de conexión al servidor")
    } finally {
      setLoading(false)
    }
  }

  const agregarBien = (bien: BienPatrimonial) => {
    if (!seleccionados.find((s) => s.codigo_patrimonial === bien.codigo_patrimonial)) {
      setSeleccionados([...seleccionados, bien])
    }
  }

  const quitarBien = (codigo: string) => {
    setSeleccionados(seleccionados.filter((s) => s.codigo_patrimonial !== codigo))
  }

  const limpiarSeleccion = () => {
    setSeleccionados([])
  }

  const imprimir = () => {
    const contenido = printRef.current
    if (!contenido) return

    const ventana = window.open("", "_blank")
    if (!ventana) return

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas Patrimoniales - UNAMAD</title>
          <style>
            @page {
              size: auto;
              margin: 5mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 10px;
            }
            .etiquetas-container {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: flex-start;
            }
            .etiqueta {
              border: 1px solid #ccc;
              padding: 8px;
              background: white;
              page-break-inside: avoid;
            }
            .etiqueta-pequena {
              width: 200px;
            }
            .etiqueta-mediana {
              width: 280px;
            }
            .etiqueta-grande {
              width: 380px;
            }
            .etiqueta-header {
              position: relative;
              margin-bottom: 4px;
            }
            .etiqueta-logo {
              position: absolute;
              left: 0;
              top: 0;
              width: 30px;
              height: 30px;
            }
            .etiqueta-titulo {
              text-align: center;
            }
            .etiqueta-titulo-unamad {
              font-size: 14px;
              font-weight: bold;
              margin: 0;
            }
            .etiqueta-titulo-siga {
              font-size: 10px;
              font-weight: bold;
              margin: 0;
            }
            .etiqueta-codigo {
              text-align: center;
              margin: 4px 0;
            }
            .etiqueta-codigo svg {
              max-width: 100%;
              height: auto;
            }
            .etiqueta-descripcion {
              font-size: 10px;
              font-weight: bold;
              text-align: center;
              margin: 4px 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .etiqueta-footer {
              font-size: 9px;
              font-weight: bold;
              text-align: center;
              margin-top: 4px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${contenido.innerHTML}
        </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => {
      ventana.print()
      ventana.close()
    }, 250)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      buscar()
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Generar Etiquetas</h1>
          <p className="text-sm text-muted-foreground">
            Busca bienes y genera etiquetas con código de barras para imprimir
          </p>
        </div>
        {seleccionados.length > 0 && (
          <Button onClick={imprimir} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir ({seleccionados.length})
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel de Búsqueda */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Buscar Bienes</CardTitle>
              <CardDescription className="text-xs">
                Ingresa código patrimonial o descripción
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex gap-2">
                <Input
                  placeholder="Código o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button onClick={buscar} disabled={loading || !busqueda.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados de búsqueda */}
          {resultados.length > 0 && (
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base">
                  Resultados ({resultados.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[80px]">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultados.map((bien) => {
                        const yaAgregado = seleccionados.some(
                          (s) => s.codigo_patrimonial === bien.codigo_patrimonial
                        )
                        return (
                          <TableRow key={bien.codigo_patrimonial}>
                            <TableCell className="font-mono text-xs">
                              {bien.codigo_patrimonial}
                            </TableCell>
                            <TableCell className="text-xs truncate max-w-[200px]">
                              {bien.descripcion}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={yaAgregado ? "secondary" : "default"}
                                onClick={() => agregarBien(bien)}
                                disabled={yaAgregado}
                              >
                                {yaAgregado ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Panel de Seleccionados y Configuración */}
        <div className="space-y-4">
          {/* Configuración */}
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid gap-2">
                <Label>Tamaño de Etiqueta</Label>
                <Select
                  value={tamano}
                  onValueChange={(v) => setTamano(v as TamanoEtiqueta)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tamanos).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bienes Seleccionados */}
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Bienes Seleccionados ({seleccionados.length})
                </CardTitle>
                {seleccionados.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={limpiarSeleccion}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {seleccionados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No hay bienes seleccionados</p>
                  <p className="text-xs">Busca y agrega bienes para generar etiquetas</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {seleccionados.map((bien) => (
                    <div
                      key={bien.codigo_patrimonial}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs">{bien.codigo_patrimonial}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {bien.descripcion}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => quitarBien(bien.codigo_patrimonial)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vista Previa de Etiquetas */}
      {seleccionados.length > 0 && (
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Vista Previa</CardTitle>
            <CardDescription className="text-xs">
              Así se verán las etiquetas al imprimir
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              ref={printRef}
              className="etiquetas-container flex flex-wrap gap-3 p-4 bg-gray-100 rounded-lg"
            >
              {seleccionados.map((bien) => (
                <div
                  key={bien.codigo_patrimonial}
                  className={`etiqueta etiqueta-${tamano} bg-white border border-gray-300 rounded p-3`}
                  style={{
                    width:
                      tamano === "pequena"
                        ? "200px"
                        : tamano === "mediana"
                        ? "280px"
                        : "380px",
                  }}
                >
                  {/* Header con logo */}
                  <div className="etiqueta-header relative mb-2">
                    <img
                      src="/logos/logo_single_min.png"
                      alt="UNAMAD"
                      className="etiqueta-logo absolute left-0 top-0"
                      style={{
                        width: tamano === "pequena" ? "24px" : tamano === "mediana" ? "30px" : "36px",
                        height: tamano === "pequena" ? "24px" : tamano === "mediana" ? "30px" : "36px",
                      }}
                    />
                    <div className="etiqueta-titulo text-center">
                      <p
                        className="etiqueta-titulo-unamad font-bold m-0"
                        style={{ fontSize: tamano === "pequena" ? "12px" : tamano === "mediana" ? "14px" : "16px" }}
                      >
                        UNAMAD
                      </p>
                      <p
                        className="etiqueta-titulo-siga font-bold m-0"
                        style={{ fontSize: tamano === "pequena" ? "8px" : tamano === "mediana" ? "10px" : "12px" }}
                      >
                        CODIFICACION SIGA
                      </p>
                    </div>
                  </div>

                  {/* Código de barras */}
                  <div className="etiqueta-codigo flex justify-center my-1">
                    <Barcode
                      value={bien.codigo_patrimonial}
                      width={tamano === "pequena" ? 1.2 : tamano === "mediana" ? 1.5 : 2}
                      height={tamano === "pequena" ? 30 : tamano === "mediana" ? 40 : 50}
                      fontSize={tamano === "pequena" ? 12 : tamano === "mediana" ? 14 : 16}
                      margin={2}
                      displayValue={true}
                    />
                  </div>

                  {/* Descripción */}
                  <div
                    className="etiqueta-descripcion font-bold text-center truncate my-1"
                    style={{ fontSize: tamano === "pequena" ? "9px" : tamano === "mediana" ? "10px" : "12px" }}
                    title={bien.descripcion}
                  >
                    {bien.descripcion}
                  </div>

                  {/* Footer */}
                  <div
                    className="etiqueta-footer font-bold text-center mt-1"
                    style={{ fontSize: tamano === "pequena" ? "7px" : tamano === "mediana" ? "8px" : "10px" }}
                  >
                    UNIDAD DE BIENES PATRIMONIALES
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
