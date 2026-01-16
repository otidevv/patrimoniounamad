import Image from "next/image"
import {
  Archive,
  BarChart3,
  Building2,
  CheckCircle,
  ClipboardList,
  FileText,
  LogIn,
  Package,
  Shield,
  TrendingDown,
  Truck,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Footer } from "@/components/footer"
import { BannerCarousel } from "@/components/banner-carousel"

const modulos = [
  {
    titulo: "Registro de Bienes",
    descripcion: "Alta y registro de bienes patrimoniales con código único",
    icono: Package,
  },
  {
    titulo: "Inventario",
    descripcion: "Control y verificación física de bienes institucionales",
    icono: ClipboardList,
  },
  {
    titulo: "Altas y Bajas",
    descripcion: "Gestión de incorporación y retiro de bienes",
    icono: Archive,
  },
  {
    titulo: "Transferencias",
    descripcion: "Movimiento de bienes entre dependencias",
    icono: Truck,
  },
  {
    titulo: "Depreciación",
    descripcion: "Cálculo automático de depreciación según normativa",
    icono: TrendingDown,
  },
  {
    titulo: "Reportes",
    descripcion: "Generación de informes y estadísticas",
    icono: BarChart3,
  },
]

const caracteristicas = [
  {
    titulo: "Cumplimiento Normativo",
    descripcion: "Alineado con las directivas de la SBN y el MEF para el control patrimonial",
    icono: FileText,
  },
  {
    titulo: "Integración SIGA",
    descripcion: "Compatible con el Sistema Integrado de Gestión Administrativa",
    icono: Building2,
  },
  {
    titulo: "Seguridad",
    descripcion: "Control de acceso por roles y auditoría de operaciones",
    icono: Shield,
  },
  {
    titulo: "Multiusuario",
    descripcion: "Acceso simultáneo para todas las dependencias de la universidad",
    icono: Users,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar gobierno */}
      <div className="bg-[#6f7271] text-white py-1">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logos/gobpe_min.jpg"
              alt="Gobierno del Perú"
              width={24}
              height={24}
              className="h-5 w-auto rounded-sm"
            />
            <span className="text-xs hidden sm:inline">gob.pe</span>
          </div>
          <span className="text-xs opacity-80">
            Plataforma digital única del Estado Peruano
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-[#1e3a5f] text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo y nombre */}
            <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <Image
                src="/logos/logo_single_min.png"
                alt="UNAMAD"
                width={56}
                height={56}
                className="h-14 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-tight">
                  SISTEMA DE GESTIÓN PATRIMONIAL
                </h1>
                <p className="text-sm text-white/80">
                  Universidad Nacional Amazónica de Madre de Dios
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-bold leading-tight">
                  SIGA PATRIMONIO
                </h1>
                <p className="text-xs text-white/80">
                  UNAMAD
                </p>
              </div>
            </a>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 bg-white text-[#1e3a5f] hover:bg-white/90 font-semibold"
                asChild
              >
                <a href="/login">
                  <LogIn className="mr-2 size-4" />
                  <span className="hidden sm:inline">Ingresar al Sistema</span>
                  <span className="sm:hidden">Ingresar</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section con Carrusel */}
      <section className="relative">
        <BannerCarousel />

        {/* Contenido sobre el carrusel */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center text-white">
              <div className="inline-flex items-center gap-2 bg-[#db0455] text-white px-4 py-2 rounded-full text-sm font-medium mb-6 pointer-events-auto">
                <CheckCircle className="size-4" />
                Módulo de Patrimonio - SIGA MEF
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-lg">
                Control Integral del Patrimonio Institucional
              </h2>
              <p className="text-lg sm:text-xl text-white/90 mb-8 drop-shadow-md max-w-2xl mx-auto">
                Sistema moderno para la gestión eficiente de los bienes patrimoniales
                de la UNAMAD, cumpliendo con los lineamientos de la SBN.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pointer-events-auto">
                <Button
                  size="lg"
                  className="bg-[#db0455] hover:bg-[#c20449] text-white font-semibold shadow-lg"
                  asChild
                >
                  <a href="/login">
                    <LogIn className="mr-2 size-5" />
                    Acceder al Sistema
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 shadow-lg"
                >
                  <FileText className="mr-2 size-5" />
                  Manual de Usuario
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Estadísticas rápidas */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { valor: "12,847", label: "Bienes Registrados" },
              { valor: "S/ 15.2M", label: "Valor Patrimonial" },
              { valor: "45", label: "Dependencias" },
              { valor: "156", label: "Usuarios Activos" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-[#1e3a5f]">{stat.valor}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Módulos del Sistema */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-[#1e3a5f] mb-3">
              Módulos del Sistema
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades completas para la gestión patrimonial según los
              procedimientos establecidos por el SIGA y la normativa vigente.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((modulo) => (
              <Card key={modulo.titulo} className="hover:shadow-lg transition-shadow border-l-4 border-l-[#db0455]">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-[#1e3a5f]/10">
                      <modulo.icono className="size-5 text-[#1e3a5f]" />
                    </div>
                    <CardTitle className="text-lg">{modulo.titulo}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {modulo.descripcion}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-[#1e3a5f] mb-3">
              Características del Sistema
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desarrollado siguiendo estándares de calidad y seguridad para
              garantizar la integridad de la información patrimonial.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {caracteristicas.map((caract) => (
              <div
                key={caract.titulo}
                className="text-center p-6 rounded-lg border hover:border-[#db0455] hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-center size-12 rounded-full bg-[#db0455]/10 mx-auto mb-4">
                  <caract.icono className="size-6 text-[#db0455]" />
                </div>
                <h4 className="font-semibold text-[#1e3a5f] mb-2">{caract.titulo}</h4>
                <p className="text-sm text-muted-foreground">{caract.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marco Normativo */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-[#1e3a5f] mb-3">
                Marco Normativo
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">Ley N° 29151</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ley General del Sistema Nacional de Bienes Estatales y su Reglamento
                  </p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">Directiva N° 001-2015/SBN</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Procedimientos de Gestión de los Bienes Muebles Estatales
                  </p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">R.D. N° 001-2019-EF/51.01</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Catálogo Nacional de Bienes Muebles del Estado
                  </p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">SIGA - MEF</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Sistema Integrado de Gestión Administrativa - Módulo Patrimonio
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final con imagen de fondo */}
      <section className="relative py-20 text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/banners/1.jpg"
            alt="UNAMAD"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#1e3a5f]/90" />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/logo_withe_shadow.png"
              alt="UNAMAD"
              width={120}
              height={120}
              className="h-24 w-auto"
            />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">
            ¿Listo para gestionar el patrimonio institucional?
          </h3>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Ingrese al sistema con sus credenciales institucionales para comenzar
            a registrar, consultar y administrar los bienes patrimoniales.
          </p>
          <Button
            size="lg"
            className="bg-[#db0455] hover:bg-[#c20449] text-white font-semibold shadow-lg"
            asChild
          >
            <a href="/login">
              <LogIn className="mr-2 size-5" />
              Ingresar al Sistema
            </a>
          </Button>
        </div>
      </section>

      {/* Logos institucionales */}
      <section className="py-8 bg-white border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            <Image
              src="/logos/gobpe.png"
              alt="Gobierno del Perú"
              width={140}
              height={50}
              className="h-10 md:h-12 w-auto grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
            />
            <Image
              src="/logos/logo_horizontal_max.png"
              alt="UNAMAD"
              width={200}
              height={60}
              className="h-12 md:h-14 w-auto"
            />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Sistema desarrollado para la
              </p>
              <p className="text-sm font-medium text-[#1e3a5f]">
                Oficina de Control Patrimonial
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
