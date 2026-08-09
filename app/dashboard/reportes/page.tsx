"use client"

import Link from "next/link"
import {
  DollarSign,
  FileSpreadsheet,
  MapPin,
  Package,
  PackagePlus,
  Search,
  Users,
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

interface Submodulo {
  id: string
  nombre: string
  descripcion: string
  icono: React.ElementType
  color: string
  href: string
}

const submodulos: Submodulo[] = [
  {
    id: "usuarios",
    nombre: "Reporte por Usuario",
    descripcion:
      "Consulta por DNI los bienes patrimoniales que una persona tiene asignados actualmente en SIGA.",
    icono: Users,
    color: "bg-blue-500",
    href: "/dashboard/reportes/usuarios",
  },
  {
    id: "bienes",
    nombre: "Ficha de Bien",
    descripcion:
      "Busca por código patrimonial, número de serie o descripción y consulta la ficha completa de un bien.",
    icono: Package,
    color: "bg-indigo-500",
    href: "/dashboard/reportes/bienes",
  },
  {
    id: "altas",
    nombre: "Altas de Bienes",
    descripcion:
      "Bienes incorporados al patrimonio en un rango de fechas, con su valor y dependencia.",
    icono: PackagePlus,
    color: "bg-teal-600",
    href: "/dashboard/reportes/altas",
  },
  {
    id: "valorizado",
    nombre: "Inventario Valorizado",
    descripcion:
      "Valor de compra, valor inicial, depreciación acumulada y valor neto, agrupado por dependencia o sede.",
    icono: DollarSign,
    color: "bg-emerald-600",
    href: "/dashboard/reportes/valorizado",
  },
  {
    id: "sedes",
    nombre: "Bienes por Sede",
    descripcion:
      "Distribución de bienes y valor neto por sede, con desglose por dependencia.",
    icono: MapPin,
    color: "bg-orange-500",
    href: "/dashboard/reportes/sedes",
  },
]

export default function ReportesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Centro de Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Reportes del patrimonio institucional con datos en tiempo real de SIGA
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <FileSpreadsheet className="mr-1 h-3 w-3" />
          Exportables a Excel
        </Badge>
      </div>

      {/* Grid de submódulos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {submodulos.map((reporte) => (
          <Card key={reporte.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg ${reporte.color} p-2.5 text-white`}>
                  <reporte.icono className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{reporte.nombre}</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {reporte.descripcion}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <Button asChild size="sm" className="w-full">
                <Link href={reporte.href}>
                  <Search className="mr-2 h-4 w-4" />
                  Abrir reporte
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
