"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  BarChart3,
  Building2,
  ChevronUp,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  ClipboardCheck,

  Search,
  Settings,
  Settings2,
  Shield,
  User,
  Users,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { PermisosMap } from "@/lib/auth"

interface UserData {
  id: string
  nombre: string
  apellidos: string
  email: string
  rol: string
  cargo?: string | null
  foto?: string | null
}

interface AppSidebarProps {
  user?: UserData | null
  permisos?: PermisosMap
}

const menuPrincipal = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    modulo: "DASHBOARD",
  },
]

const menuPatrimonio = [
  {
    title: "Mis Bienes",
    url: "/dashboard/patrimonio/mis-bienes",
    icon: PackageCheck,
    modulo: "BIENES",
  },
  {
    title: "Buscar Bien",
    url: "/dashboard/patrimonio/buscar",
    icon: Search,
    modulo: "BIENES",
  },
  {
    title: "Inventario Físico",
    url: "/dashboard/patrimonio/inventario",
    icon: ClipboardList,
    modulo: "INVENTARIO",
  },
  {
    title: "Mis Verificaciones",
    url: "/dashboard/patrimonio/mis-verificaciones",
    icon: ClipboardCheck,
    modulo: "BIENES",
  },
  {
    title: "Generar Etiquetas",
    url: "/dashboard/patrimonio/etiquetas",
    icon: Package,
    modulo: "BIENES",
  },
  {
    title: "Reportes",
    url: "/dashboard/patrimonio/reportes",
    icon: BarChart3,
    modulo: "REPORTES",
  },
]

const menuCatalogos = [
  {
    title: "Sedes",
    url: "/dashboard/sedes",
    icon: MapPin,
    modulo: "SEDES",
  },
  {
    title: "Dependencias",
    url: "/dashboard/dependencias",
    icon: Building2,
    modulo: "DEPENDENCIAS",
  },
]

const menuTramite = [
  {
    title: "Trámite Documentario",
    url: "/dashboard/tramite",
    icon: FileText,
    modulo: "TRAMITE",
  },
]

const menuReportes = [
  {
    title: "Reportes",
    url: "/dashboard/reportes",
    icon: BarChart3,
    modulo: "REPORTES",
  },
  {
    title: "Documentos",
    url: "/dashboard/documentos",
    icon: FileText,
    modulo: "DOCUMENTOS",
  },
]

const menuAdmin = [
  {
    title: "Panel de Administración",
    url: "/dashboard/admin",
    icon: Settings2,
    modulo: "ADMIN_PANEL",
  },
  {
    title: "Roles y Permisos",
    url: "/dashboard/admin/roles",
    icon: Shield,
    modulo: "ROLES_PERMISOS",
  },
  {
    title: "Usuarios",
    url: "/dashboard/admin/usuarios",
    icon: Users,
    modulo: "USUARIOS",
  },
  {
    title: "Configuración",
    url: "/dashboard/configuracion",
    icon: Settings,
    modulo: "CONFIGURACION",
  },
]

export function AppSidebar({ user, permisos = {} }: AppSidebarProps) {
  const router = useRouter()

  // Función para verificar si el usuario puede ver un módulo
  const canView = (modulo: string): boolean => {
    // Admin siempre puede ver todo
    if (user?.rol === "ADMIN") return true
    // Si hay permisos definidos, verificar
    return permisos[modulo]?.ver ?? false
  }

  // Filtrar menús según permisos
  const filteredMenuPrincipal = menuPrincipal.filter((item) => canView(item.modulo))
  const filteredMenuPatrimonio = menuPatrimonio.filter((item) => canView(item.modulo))
  const filteredMenuCatalogos = menuCatalogos.filter((item) => canView(item.modulo))
  const filteredMenuTramite = menuTramite.filter((item) => canView(item.modulo))
  const filteredMenuReportes = menuReportes.filter((item) => canView(item.modulo))
  const filteredMenuAdmin = menuAdmin.filter((item) => canView(item.modulo))

  const handleLogout = async () => {
    try {
      // Borrar JWT propio
      await fetch("/api/auth/logout", { method: "POST" })
      // Cerrar sesión de NextAuth (Google) sin redirigir automáticamente
      await signOut({ redirect: false })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      // Forzar redirección aunque falle
      window.location.href = "/login"
    }
  }

  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase()
  }

  const getNombreCompleto = () => {
    if (user) {
      return `${user.nombre} ${user.apellidos}`
    }
    return "Usuario"
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
                  <Package className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SIGA Patrimonio</span>
                  <span className="truncate text-xs text-muted-foreground">UNAMAD</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {filteredMenuPrincipal.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Principal</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuPrincipal.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredMenuPatrimonio.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Patrimonio</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuPatrimonio.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredMenuCatalogos.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Catálogos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuCatalogos.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredMenuTramite.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Trámite Documentario</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuTramite.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredMenuReportes.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Reportes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuReportes.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredMenuAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredMenuAdmin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    {user?.foto && <AvatarImage src={user.foto} alt={getNombreCompleto()} />}
                    <AvatarFallback className="rounded-lg bg-[#1e3a5f] text-white">
                      {user ? getInitials(user.nombre, user.apellidos) : "US"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{getNombreCompleto()}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || "usuario@unamad.edu.pe"}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/perfil" className="cursor-pointer">
                    <User className="mr-2 size-4" />
                    Mi Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/configuracion" className="cursor-pointer">
                    <Settings className="mr-2 size-4" />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 size-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
