"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
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

interface MenuItem {
  title: string
  url: string
  icon: LucideIcon
  modulo: string
}

interface MenuGroup {
  key: string
  label: string
  items: MenuItem[]
}

const menuPrincipal: MenuItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home, modulo: "DASHBOARD" },
]

const menuPatrimonio: MenuItem[] = [
  { title: "Mis Bienes", url: "/dashboard/patrimonio/mis-bienes", icon: PackageCheck, modulo: "BIENES" },
  { title: "Buscar Bien", url: "/dashboard/patrimonio/buscar", icon: Search, modulo: "BIENES" },
  { title: "Inventario Físico", url: "/dashboard/patrimonio/inventario", icon: ClipboardList, modulo: "INVENTARIO" },
  { title: "Mis Verificaciones", url: "/dashboard/patrimonio/mis-verificaciones", icon: ClipboardCheck, modulo: "BIENES" },
  { title: "Generar Etiquetas", url: "/dashboard/patrimonio/etiquetas", icon: Package, modulo: "BIENES" },
  { title: "Reportes", url: "/dashboard/patrimonio/reportes", icon: BarChart3, modulo: "REPORTES" },
]

const menuCatalogos: MenuItem[] = [
  { title: "Sedes", url: "/dashboard/sedes", icon: MapPin, modulo: "SEDES" },
  { title: "Dependencias", url: "/dashboard/dependencias", icon: Building2, modulo: "DEPENDENCIAS" },
]

const menuTramite: MenuItem[] = [
  { title: "Trámite Documentario", url: "/dashboard/tramite", icon: FileText, modulo: "TRAMITE" },
]

const menuReportes: MenuItem[] = [
  { title: "Reportes", url: "/dashboard/reportes", icon: BarChart3, modulo: "REPORTES" },
  { title: "Documentos", url: "/dashboard/documentos", icon: FileText, modulo: "DOCUMENTOS" },
]

const menuAdmin: MenuItem[] = [
  { title: "Panel de Administración", url: "/dashboard/admin", icon: Settings2, modulo: "ADMIN_PANEL" },
  { title: "Roles y Permisos", url: "/dashboard/admin/roles", icon: Shield, modulo: "ROLES_PERMISOS" },
  { title: "Usuarios", url: "/dashboard/admin/usuarios", icon: Users, modulo: "USUARIOS" },
  { title: "Configuración", url: "/dashboard/configuracion", icon: Settings, modulo: "CONFIGURACION" },
]

// Catálogo de grupos en orden de aparición (stable reference a nivel de módulo)
const MENU_GROUPS: { key: string; label: string; items: MenuItem[] }[] = [
  { key: "principal", label: "Principal", items: menuPrincipal },
  { key: "patrimonio", label: "Patrimonio", items: menuPatrimonio },
  { key: "catalogos", label: "Catálogos", items: menuCatalogos },
  { key: "tramite", label: "Trámite Documentario", items: menuTramite },
  { key: "reportes", label: "Reportes", items: menuReportes },
  { key: "admin", label: "Administración", items: menuAdmin },
]

/**
 * Longest-prefix match: la URL más específica gana.
 * `/dashboard/admin/usuarios` → "Usuarios", NO "Panel de Administración".
 * `/dashboard/x-y` NO matchea `/dashboard/x` (requiere `/` separador).
 */
function pickActiveUrl(pathname: string, items: MenuItem[]): string {
  let best = ""
  for (const { url } of items) {
    const matches = pathname === url || pathname.startsWith(url + "/")
    if (matches && url.length > best.length) best = url
  }
  return best
}

// Classes del item activo (module-level, no recalcula en render)
const activeItemClass = cn(
  "transition-colors",
  "data-[active=true]:bg-[#0c1f3a]",
  "data-[active=true]:text-white",
  "data-[active=true]:font-medium",
  "data-[active=true]:shadow-sm",
  "data-[active=true]:shadow-slate-900/15",
  "data-[active=true]:hover:bg-[#0a1a30]",
  "data-[active=true]:hover:text-white",
  "data-[active=true]:[&_svg]:text-amber-300",
  // Barra amber de 3px en borde izquierdo (pseudo-elemento, no afecta layout)
  "data-[active=true]:relative",
  "data-[active=true]:before:absolute",
  "data-[active=true]:before:left-0",
  "data-[active=true]:before:top-1/2",
  "data-[active=true]:before:-translate-y-1/2",
  "data-[active=true]:before:h-5",
  "data-[active=true]:before:w-[3px]",
  "data-[active=true]:before:rounded-full",
  "data-[active=true]:before:bg-amber-300"
)

const activeGroupLabelClass = "text-[#0c1f3a] font-semibold"

function MenuList({
  items,
  activeUrl,
}: {
  items: MenuItem[]
  activeUrl: string
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.url === activeUrl
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              isActive={isActive}
              className={activeItemClass}
            >
              <Link
                href={item.url}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function AppSidebar({ user, permisos = {} }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname() || ""
  const rol = user?.rol

  // Filtrado de grupos memoizado. Solo re-ejecuta si cambian permisos o rol.
  const filteredGroups = useMemo<MenuGroup[]>(() => {
    const canView = (modulo: string): boolean => {
      if (rol === "ADMIN") return true
      return permisos[modulo]?.ver ?? false
    }
    return MENU_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      items: g.items.filter((i) => canView(i.modulo)),
    })).filter((g) => g.items.length > 0)
  }, [permisos, rol])

  // URL activa (longest-prefix match). Se recomputa solo con pathname o permisos.
  const activeUrl = useMemo(() => {
    const all: MenuItem[] = []
    for (const g of filteredGroups) all.push(...g.items)
    return pickActiveUrl(pathname, all)
  }, [pathname, filteredGroups])

  // Label del grupo que contiene el item activo (breadcrumb visual).
  const activeGroupLabel = useMemo(() => {
    if (!activeUrl) return null
    for (const g of filteredGroups) {
      if (g.items.some((i) => i.url === activeUrl)) return g.label
    }
    return null
  }, [activeUrl, filteredGroups])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      await signOut({ redirect: false })
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      window.location.href = "/login"
    }
  }

  const getInitials = (nombre: string, apellidos: string) => {
    const ini = `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase().trim()
    return ini || "US"
  }

  const getNombreCompleto = () =>
    user ? `${user.nombre} ${user.apellidos}`.trim() || "Usuario" : "Usuario"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#0c1f3a] text-amber-200">
                  <Package className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SIGA Patrimonio</span>
                  <span className="truncate text-xs text-muted-foreground">
                    UNAMAD
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((g) => (
          <SidebarGroup key={g.key}>
            <SidebarGroupLabel
              className={cn(
                "transition-colors",
                g.label === activeGroupLabel && activeGroupLabelClass
              )}
            >
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <MenuList items={g.items} activeUrl={activeUrl} />
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
                    {user?.foto && (
                      <AvatarImage src={user.foto} alt={getNombreCompleto()} />
                    )}
                    <AvatarFallback className="rounded-lg bg-[#0c1f3a] text-amber-200">
                      {user ? getInitials(user.nombre, user.apellidos) : "US"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {getNombreCompleto()}
                    </span>
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
                  <Link
                    href="/dashboard/configuracion"
                    className="cursor-pointer"
                  >
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
