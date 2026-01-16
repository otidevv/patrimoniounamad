import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ClipboardList,
  Package,
  Search,
  TrendingUp,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const estadisticas = [
  {
    titulo: "Total Bienes",
    valor: "12,847",
    descripcion: "Bienes registrados",
    icono: Package,
    tendencia: "+2.5%",
    tendenciaPositiva: true,
  },
  {
    titulo: "Valor Patrimonial",
    valor: "S/ 15.2M",
    descripcion: "Valor total estimado",
    icono: TrendingUp,
    tendencia: "+8.1%",
    tendenciaPositiva: true,
  },
  {
    titulo: "Altas este mes",
    valor: "156",
    descripcion: "Nuevos bienes",
    icono: ArrowUpRight,
    tendencia: "+12",
    tendenciaPositiva: true,
  },
  {
    titulo: "Bajas este mes",
    valor: "23",
    descripcion: "Bienes dados de baja",
    icono: ArrowDownRight,
    tendencia: "-5",
    tendenciaPositiva: false,
  },
]

const accesosRapidos = [
  {
    titulo: "Registrar Bien",
    descripcion: "Alta de nuevo bien patrimonial",
    icono: Archive,
    href: "/bienes/nuevo",
    color: "bg-emerald-500",
  },
  {
    titulo: "Buscar Bien",
    descripcion: "Búsqueda por código o descripción",
    icono: Search,
    href: "/bienes",
    color: "bg-blue-500",
  },
  {
    titulo: "Inventario",
    descripcion: "Gestión de inventario físico",
    icono: ClipboardList,
    href: "/inventario",
    color: "bg-amber-500",
  },
  {
    titulo: "Transferencias",
    descripcion: "Movimiento entre dependencias",
    icono: Building2,
    href: "/transferencias",
    color: "bg-purple-500",
  },
]

const actividadReciente = [
  {
    tipo: "alta",
    descripcion: "Computadora HP ProDesk 400",
    codigo: "740899500001",
    usuario: "Juan Pérez",
    fecha: "Hace 2 horas",
    dependencia: "Facultad de Ingeniería",
  },
  {
    tipo: "transferencia",
    descripcion: "Escritorio de madera",
    codigo: "740841000234",
    usuario: "María García",
    fecha: "Hace 4 horas",
    dependencia: "Oficina de Administración",
  },
  {
    tipo: "baja",
    descripcion: "Impresora Epson L355",
    codigo: "740895000089",
    usuario: "Carlos López",
    fecha: "Hace 1 día",
    dependencia: "Biblioteca Central",
  },
  {
    tipo: "alta",
    descripcion: "Proyector Epson PowerLite",
    codigo: "740899500002",
    usuario: "Ana Torres",
    fecha: "Hace 1 día",
    dependencia: "Aula Magna",
  },
  {
    tipo: "inventario",
    descripcion: "Inventario Laboratorio Química",
    codigo: "INV-2024-015",
    usuario: "Roberto Silva",
    fecha: "Hace 2 días",
    dependencia: "Lab. de Química",
  },
]

function getBadgeVariant(tipo: string) {
  switch (tipo) {
    case "alta":
      return "default"
    case "baja":
      return "destructive"
    case "transferencia":
      return "secondary"
    case "inventario":
      return "outline"
    default:
      return "default"
  }
}

function getTipoLabel(tipo: string) {
  switch (tipo) {
    case "alta":
      return "Alta"
    case "baja":
      return "Baja"
    case "transferencia":
      return "Transferencia"
    case "inventario":
      return "Inventario"
    default:
      return tipo
  }
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Buscador rápido */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código patrimonial o descripción..."
            className="pl-10"
          />
        </div>
        <Button>
          <Search className="mr-2 size-4" />
          Buscar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {estadisticas.map((stat) => (
          <Card key={stat.titulo}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.titulo}
              </CardTitle>
              <stat.icono className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.valor}</div>
              <p className="text-xs text-muted-foreground">
                {stat.descripcion}
                <span
                  className={`ml-2 ${
                    stat.tendenciaPositiva ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {stat.tendencia}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accesos rápidos y Actividad reciente */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Accesos rápidos */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>Operaciones frecuentes</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {accesosRapidos.map((acceso) => (
              <a
                key={acceso.titulo}
                href={acceso.href}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${acceso.color} text-white`}
                >
                  <acceso.icono className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{acceso.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {acceso.descripcion}
                  </div>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos movimientos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {actividadReciente.map((actividad, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-lg border p-3"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(actividad.tipo)}>
                        {getTipoLabel(actividad.tipo)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {actividad.fecha}
                      </span>
                    </div>
                    <p className="font-medium">{actividad.descripcion}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Código: {actividad.codigo}</span>
                      <span>{actividad.dependencia}</span>
                      <span>Por: {actividad.usuario}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm">
                Ver toda la actividad
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por dependencia */}
      <Card>
        <CardHeader>
          <CardTitle>Bienes por Dependencia</CardTitle>
          <CardDescription>
            Distribución de bienes patrimoniales por unidad orgánica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { nombre: "Rectorado", cantidad: 456, porcentaje: 3.5 },
              { nombre: "Vicerrectorado Académico", cantidad: 892, porcentaje: 6.9 },
              { nombre: "Facultad de Ingeniería", cantidad: 2341, porcentaje: 18.2 },
              { nombre: "Facultad de Educación", cantidad: 1876, porcentaje: 14.6 },
              { nombre: "Facultad de Contabilidad", cantidad: 1234, porcentaje: 9.6 },
              { nombre: "Biblioteca Central", cantidad: 3456, porcentaje: 26.9 },
              { nombre: "Oficina de Administración", cantidad: 987, porcentaje: 7.7 },
              { nombre: "Otras dependencias", cantidad: 1605, porcentaje: 12.5 },
            ].map((dep) => (
              <div key={dep.nombre} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dep.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {dep.porcentaje}%
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{dep.cantidad.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">bienes</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${dep.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
