import { redirect } from "next/navigation"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeSync } from "@/components/theme-sync"
import { getCurrentUser, getUserPermisos, isAuthenticated } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect("/login")
  }

  const user = await getCurrentUser()
  const permisos = await getUserPermisos()

  return (
    <SidebarProvider>
      <ThemeSync />
      <AppSidebar user={user} permisos={permisos} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-sm font-medium">Sistema de Gestión de Patrimonio</h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
