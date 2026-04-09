"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Inbox,
  Send,
  FilePlus,
  FolderOpen,
  FolderArchive,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Bandeja de Entrada", href: "/dashboard/tramite/entrada", icon: Inbox },
  { label: "Bandeja de Salida", href: "/dashboard/tramite/salida", icon: Send },
  { label: "Nuevo Documento", href: "/dashboard/tramite/nuevo", icon: FilePlus },
  { label: "Mis Documentos", href: "/dashboard/tramite/mis-documentos", icon: FolderOpen },
  { label: "Mi Repositorio", href: "/dashboard/tramite/repositorio", icon: FolderArchive },
  { label: "Tipos de Documento", href: "/dashboard/tramite/tipos", icon: FileText },
]

export default function TramiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // No mostrar tabs en rutas de detalle (derivar/[id], documento/[id])
  const isDetailRoute = /\/tramite\/(derivar|documento)\//.test(pathname)

  if (isDetailRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra de pestañas */}
      <nav
        className="border-b bg-background sticky top-0 z-10"
        aria-label="Secciones de Trámite Documentario"
      >
        <div className="overflow-x-auto px-4 md:px-6">
          <div className="flex gap-1 min-w-max py-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              const Icon = tab.icon
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors whitespace-nowrap cursor-pointer",
                    isActive
                      ? "bg-[#1e3a5f] text-white font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ").slice(-1)[0]}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Contenido de la pestaña activa */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
