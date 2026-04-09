"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Permiso {
  id?: string
  rolId: string
  modulo: string
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

interface UserProfile {
  rol: string
  rolId: string
}

interface PermisoModulo {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

interface RolInfo {
  id: string
  codigo: string
  nombre: string
  color: string
  descripcion?: string
  esSistema: boolean
}

const COLORES_DISPONIBLES = [
  { value: "#ef4444", label: "Rojo", class: "bg-red-500" },
  { value: "#f97316", label: "Naranja", class: "bg-orange-500" },
  { value: "#eab308", label: "Amarillo", class: "bg-yellow-500" },
  { value: "#22c55e", label: "Verde", class: "bg-green-500" },
  { value: "#14b8a6", label: "Teal", class: "bg-teal-500" },
  { value: "#3b82f6", label: "Azul", class: "bg-blue-500" },
  { value: "#8b5cf6", label: "Violeta", class: "bg-violet-500" },
  { value: "#ec4899", label: "Rosa", class: "bg-pink-500" },
  { value: "#6b7280", label: "Gris", class: "bg-gray-500" },
]

// Módulos agrupados por categoría (coincide con la navegación del sidebar)
const GRUPOS_MODULOS = [
  {
    grupo: "Principal",
    modulos: [
      { value: "DASHBOARD", label: "Dashboard", descripcion: "Panel principal del sistema" },
    ],
  },
  {
    grupo: "Patrimonio",
    modulos: [
      { value: "BIENES", label: "Bienes Patrimoniales", descripcion: "Gestión y búsqueda de bienes" },
      { value: "INVENTARIO", label: "Inventario Físico", descripcion: "Control de inventario" },
      { value: "ALTAS", label: "Altas de Bienes", descripcion: "Registro de nuevos bienes" },
      { value: "BAJAS", label: "Bajas de Bienes", descripcion: "Dar de baja bienes" },
      { value: "TRANSFERENCIAS", label: "Transferencias", descripcion: "Transferir bienes entre dependencias" },
      { value: "REPORTES", label: "Reportes", descripcion: "Generación de reportes" },
      { value: "DOCUMENTOS", label: "Documentos", descripcion: "Gestión documental" },
    ],
  },
  {
    grupo: "Catálogos",
    modulos: [
      { value: "SEDES", label: "Sedes", descripcion: "Gestión de sedes de la universidad" },
      { value: "DEPENDENCIAS", label: "Dependencias", descripcion: "Unidades orgánicas" },
      { value: "CATEGORIAS", label: "Categorías", descripcion: "Catálogo de categorías" },
      { value: "RESPONSABLES", label: "Responsables", descripcion: "Gestión de responsables" },
    ],
  },
  {
    grupo: "Trámite Documentario",
    modulos: [
      { value: "TRAMITE", label: "Trámite Documentario", descripcion: "Bandeja de entrada, salida, nuevo documento, mi repositorio" },
    ],
  },
  {
    grupo: "Administración",
    modulos: [
      { value: "ADMIN_PANEL", label: "Panel de Administración", descripcion: "Acceso al panel de administración" },
      { value: "ROLES_PERMISOS", label: "Roles y Permisos", descripcion: "Gestión de roles y permisos" },
      { value: "USUARIOS", label: "Usuarios", descripcion: "Administración de usuarios" },
      { value: "CONFIGURACION", label: "Configuración", descripcion: "Configuración del sistema" },
    ],
  },
]

// Lista plana de todos los módulos
const TODOS_LOS_MODULOS = GRUPOS_MODULOS.flatMap((g) => g.modulos)

const ACCIONES = [
  { key: "ver", label: "Ver" },
  { key: "crear", label: "Crear" },
  { key: "editar", label: "Editar" },
  { key: "eliminar", label: "Eliminar" },
  { key: "reportes", label: "Reportes" },
] as const

const initialFormData = {
  codigo: "",
  nombre: "",
  descripcion: "",
  color: "#6b7280",
}

export default function RolesPermisosPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [permisosModulo, setPermisosModulo] = useState<PermisoModulo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedRolId, setSelectedRolId] = useState<string>("")
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [roles, setRoles] = useState<RolInfo[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; rol: RolInfo | null }>({
    open: false,
    rol: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  // Grupos colapsados en mobile
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  // Dirty state para advertir cambios no guardados
  const [isDirty, setIsDirty] = useState(false)

  const selectedRol = useMemo(() => roles.find((r) => r.id === selectedRolId), [roles, selectedRolId])

  // Contadores de permisos activos por grupo
  const permisosCountByGroup = useMemo(() => {
    const counts: Record<string, { total: number; activos: number }> = {}
    for (const grupo of GRUPOS_MODULOS) {
      let total = 0
      let activos = 0
      for (const modulo of grupo.modulos) {
        const p = permisos.find((pm) => pm.modulo === modulo.value)
        total += 5
        if (p) {
          if (p.ver) activos++
          if (p.crear) activos++
          if (p.editar) activos++
          if (p.eliminar) activos++
          if (p.reportes) activos++
        }
      }
      counts[grupo.grupo] = { total, activos }
    }
    return counts
  }, [permisos])

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    if (permisosModulo?.ver) fetchRoles()
  }, [permisosModulo])

  useEffect(() => {
    if (permisosModulo?.ver && selectedRolId) {
      fetchPermisos()
      setIsDirty(false)
    }
  }, [permisosModulo, selectedRolId])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (!response.ok) { router.push("/login"); return }
      const data = await response.json()
      setUser(data.user)

      const permisosResponse = await fetch("/api/auth/permisos")
      if (permisosResponse.ok) {
        const permisosData = await permisosResponse.json()
        const permisoRoles = permisosData.permisos?.ROLES_PERMISOS

        if (data.user.rol === "ADMIN") {
          setPermisosModulo({ ver: true, crear: true, editar: true, eliminar: true, reportes: true })
        } else if (permisoRoles?.ver) {
          setPermisosModulo(permisoRoles)
        } else {
          toast.error("No tienes permisos para acceder a esta sección")
          router.push("/dashboard")
        }
      }
    } catch {
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPermisos = async () => {
    if (!selectedRolId) return
    try {
      const response = await fetch(`/api/admin/permisos?rolId=${selectedRolId}`)
      if (response.ok) {
        const data = await response.json()
        const permisosCompletos = TODOS_LOS_MODULOS.map((modulo) => {
          const existing = data.permisos.find((p: Permiso) => p.modulo === modulo.value)
          return existing || {
            rolId: selectedRolId,
            modulo: modulo.value,
            ver: false, crear: false, editar: false, eliminar: false, reportes: false,
          }
        })
        setPermisos(permisosCompletos)
      }
    } catch {
      toast.error("Error al cargar permisos")
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles")
      if (response.ok) {
        const data = await response.json()
        const rolesFormatted: RolInfo[] = data.roles.map((rol: RolInfo) => ({
          id: rol.id, codigo: rol.codigo, nombre: rol.nombre,
          color: rol.color, descripcion: rol.descripcion, esSistema: rol.esSistema,
        }))
        setRoles(rolesFormatted)
        if (!selectedRolId && rolesFormatted.length > 0) {
          setSelectedRolId(rolesFormatted[0].id)
        }
      }
    } catch {
      toast.error("Error al cargar roles")
    }
  }

  const handleCreateRol = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.codigo || !formData.nombre) {
      toast.error("Código y nombre son requeridos")
      return
    }
    setIsCreating(true)
    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success("Rol creado correctamente")
        setIsModalOpen(false)
        setFormData(initialFormData)
        await fetchRoles()
      } else {
        toast.error(data.error || "Error al crear rol")
      }
    } catch {
      toast.error("Error al crear rol")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteRol = async () => {
    if (!deleteModal.rol?.id) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/roles?id=${deleteModal.rol.id}`, { method: "DELETE" })
      if (response.ok) {
        toast.success("Rol eliminado correctamente")
        setDeleteModal({ open: false, rol: null })
        if (selectedRolId === deleteModal.rol.id) {
          const remaining = roles.filter((r) => r.id !== deleteModal.rol!.id)
          setSelectedRolId(remaining.length > 0 ? remaining[0].id : "")
        }
        await fetchRoles()
      } else {
        const data = await response.json()
        toast.error(data.error || "Error al eliminar rol")
      }
    } catch {
      toast.error("Error al eliminar rol")
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePermisoChange = useCallback((modulo: string, accion: string, value: boolean) => {
    setIsDirty(true)
    setPermisos((prev) =>
      prev.map((p) => (p.modulo === modulo ? { ...p, [accion]: value } : p))
    )
  }, [])

  const handleSelectAllModulo = useCallback((modulo: string, selectAll: boolean) => {
    setIsDirty(true)
    setPermisos((prev) =>
      prev.map((p) =>
        p.modulo === modulo
          ? { ...p, ver: selectAll, crear: selectAll, editar: selectAll, eliminar: selectAll, reportes: selectAll }
          : p
      )
    )
  }, [])

  const handleSelectAllGrupo = useCallback((grupo: typeof GRUPOS_MODULOS[0], selectAll: boolean) => {
    setIsDirty(true)
    const moduloValues = new Set(grupo.modulos.map((m) => m.value))
    setPermisos((prev) =>
      prev.map((p) =>
        moduloValues.has(p.modulo)
          ? { ...p, ver: selectAll, crear: selectAll, editar: selectAll, eliminar: selectAll, reportes: selectAll }
          : p
      )
    )
  }, [])

  const handleSelectAllAccion = useCallback((accion: string, selectAll: boolean) => {
    setIsDirty(true)
    setPermisos((prev) => prev.map((p) => ({ ...p, [accion]: selectAll })))
  }, [])

  const getPermisoValue = useCallback((modulo: string, accion: string): boolean => {
    const permiso = permisos.find((p) => p.modulo === modulo)
    return permiso ? (permiso[accion as keyof Permiso] as boolean) : false
  }, [permisos])

  const isModuloAllSelected = useCallback((modulo: string): boolean => {
    const p = permisos.find((pm) => pm.modulo === modulo)
    return p ? p.ver && p.crear && p.editar && p.eliminar && p.reportes : false
  }, [permisos])

  const isGrupoAllSelected = useCallback((grupo: typeof GRUPOS_MODULOS[0]): boolean => {
    return grupo.modulos.every((m) => isModuloAllSelected(m.value))
  }, [isModuloAllSelected])

  const isAccionAllSelected = useCallback((accion: string): boolean => {
    return TODOS_LOS_MODULOS.every((m) => getPermisoValue(m.value, accion))
  }, [getPermisoValue])

  const toggleGroupCollapse = (grupo: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(grupo)) next.delete(grupo)
      else next.add(grupo)
      return next
    })
  }

  const handleSavePermisos = async () => {
    if (!selectedRolId) { toast.error("Selecciona un rol primero"); return }
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/permisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolId: selectedRolId, permisos }),
      })
      if (response.ok) {
        toast.success("Permisos guardados correctamente", {
          description: "Los usuarios con este rol verán los cambios al recargar.",
        })
        setIsDirty(false)
        await fetchPermisos()
      } else {
        const data = await response.json()
        toast.error(data.error || "Error al guardar permisos")
      }
    } catch {
      toast.error("Error al guardar permisos")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectRol = (rolId: string) => {
    if (isDirty) {
      const confirmed = window.confirm("Tienes cambios sin guardar. ¿Deseas cambiar de rol y perder los cambios?")
      if (!confirmed) return
    }
    setSelectedRolId(rolId)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" role="status">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Cargando roles y permisos...</span>
      </div>
    )
  }

  if (!permisosModulo?.ver) return null

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/dashboard/admin" aria-label="Volver al panel de administración">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
              <Shield className="size-5 md:size-6 shrink-0" aria-hidden="true" />
              <span className="truncate">Roles y Permisos</span>
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Define qué acciones puede realizar cada rol en cada módulo
            </p>
          </div>
        </div>
        {permisosModulo?.crear && (
          <Button onClick={() => setIsModalOpen(true)} className="bg-[#1e3a5f] hover:bg-[#152a45] w-full sm:w-auto">
            <Plus className="size-4 mr-2" aria-hidden="true" />
            Nuevo Rol
          </Button>
        )}
      </div>

      {/* Selector de roles como lista lateral en desktop, horizontal en mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Panel de roles */}
        <Card className="lg:sticky lg:top-4 self-start">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm font-semibold">Roles del sistema</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <nav aria-label="Lista de roles">
              <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
                {roles.map((rol) => (
                  <li key={rol.id}>
                    <button
                      onClick={() => handleSelectRol(rol.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors whitespace-nowrap lg:whitespace-normal cursor-default ${
                        selectedRolId === rol.id
                          ? "bg-[#1e3a5f]/10 text-[#1e3a5f] font-medium"
                          : "hover:bg-muted text-foreground"
                      }`}
                      aria-current={selectedRolId === rol.id ? "true" : undefined}
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: rol.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{rol.nombre}</span>
                      {rol.esSistema && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto shrink-0">
                          Sistema
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </CardContent>
        </Card>

        {/* Panel de permisos */}
        {selectedRol ? (
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-white text-xs" style={{ backgroundColor: selectedRol.color }}>
                    {selectedRol.nombre}
                  </Badge>
                  {selectedRol.descripcion && (
                    <span className="text-xs text-muted-foreground">{selectedRol.descripcion}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!selectedRol.esSistema && permisosModulo?.eliminar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteModal({ open: true, rol: selectedRol })}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="size-4 sm:mr-1.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                  )}
                  <Button
                    onClick={handleSavePermisos}
                    disabled={isSaving || !isDirty}
                    size="sm"
                    className="bg-[#1e3a5f] hover:bg-[#152a45] flex-1 sm:flex-none"
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin sm:mr-1.5" aria-hidden="true" />
                    ) : (
                      <Save className="size-4 sm:mr-1.5" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">{isSaving ? "Guardando..." : "Guardar"}</span>
                  </Button>
                </div>
              </div>
              {isDirty && (
                <p className="text-xs text-amber-600 mt-1">
                  Tienes cambios sin guardar
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {/* Desktop: Tabla agrupada */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" role="grid" aria-label="Matriz de permisos por módulo">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th scope="col" className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[280px]">
                          Módulo
                        </th>
                        {ACCIONES.map((a) => (
                          <th key={a.key} scope="col" className="text-center p-2 w-20">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{a.label}</span>
                              <Checkbox
                                checked={isAccionAllSelected(a.key)}
                                onCheckedChange={(v) => handleSelectAllAccion(a.key, v as boolean)}
                                className="data-[state=checked]:bg-[#1e3a5f]"
                                aria-label={`Seleccionar ${a.label} en todos los módulos`}
                              />
                            </div>
                          </th>
                        ))}
                        <th scope="col" className="text-center p-2 w-16">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Todo</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {GRUPOS_MODULOS.map((grupo) => {
                        const stats = permisosCountByGroup[grupo.grupo]
                        const allSelected = isGrupoAllSelected(grupo)
                        return (
                          <GroupRows
                            key={grupo.grupo}
                            grupo={grupo}
                            stats={stats}
                            allSelected={allSelected}
                            onToggleAll={(v) => handleSelectAllGrupo(grupo, v)}
                            getPermisoValue={getPermisoValue}
                            isModuloAllSelected={isModuloAllSelected}
                            onPermisoChange={handlePermisoChange}
                            onSelectAllModulo={handleSelectAllModulo}
                          />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: Cards agrupadas con collapse */}
              <div className="md:hidden p-3 space-y-3">
                {GRUPOS_MODULOS.map((grupo) => {
                  const isCollapsed = collapsedGroups.has(grupo.grupo)
                  const stats = permisosCountByGroup[grupo.grupo]
                  return (
                    <div key={grupo.grupo} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleGroupCollapse(grupo.grupo)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 text-left"
                        aria-expanded={!isCollapsed}
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                          )}
                          <span className="text-sm font-semibold">{grupo.grupo}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {stats?.activos || 0}/{stats?.total || 0}
                        </Badge>
                      </button>
                      {!isCollapsed && (
                        <div className="p-2 space-y-2">
                          {grupo.modulos.map((modulo) => (
                            <div key={modulo.value} className="border rounded-md p-2.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">{modulo.label}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{modulo.descripcion}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAllModulo(modulo.value, !isModuloAllSelected(modulo.value))}
                                  className="h-7 px-2 shrink-0"
                                  aria-label={`${isModuloAllSelected(modulo.value) ? "Desmarcar" : "Marcar"} todos los permisos de ${modulo.label}`}
                                >
                                  {isModuloAllSelected(modulo.value) ? (
                                    <Check className="size-4 text-green-600" aria-hidden="true" />
                                  ) : (
                                    <X className="size-4 text-gray-400" aria-hidden="true" />
                                  )}
                                </Button>
                              </div>
                              <div className="grid grid-cols-5 gap-1">
                                {ACCIONES.map((a) => (
                                  <label key={a.key} className="flex flex-col items-center gap-1 cursor-pointer">
                                    <Checkbox
                                      checked={getPermisoValue(modulo.value, a.key)}
                                      onCheckedChange={(v) => handlePermisoChange(modulo.value, a.key, v as boolean)}
                                      className="data-[state=checked]:bg-[#1e3a5f]"
                                    />
                                    <span className="text-[10px] text-muted-foreground">{a.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="size-10 mb-3 opacity-30" aria-hidden="true" />
              <p className="text-sm">Selecciona un rol para configurar sus permisos</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Crear Rol */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Rol</DialogTitle>
            <DialogDescription>Crea un nuevo rol personalizado para el sistema</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRol}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
                  placeholder="Ej: AUDITOR, INVENTARIADOR"
                  maxLength={20}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">Solo letras mayúsculas, números y guiones bajos</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Auditor, Inventariador"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del rol"
                  autoComplete="off"
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Color</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {COLORES_DISPONIBLES.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      role="radio"
                      aria-checked={formData.color === color.value}
                      aria-label={color.label}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`size-8 rounded-full ${color.class} transition-all ${
                        formData.color === color.value
                          ? "ring-2 ring-offset-2 ring-[#1e3a5f]"
                          : "hover:scale-110"
                      }`}
                    />
                  ))}
                </div>
              </fieldset>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsModalOpen(false); setFormData(initialFormData) }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !formData.codigo || !formData.nombre}
                className="bg-[#1e3a5f] hover:bg-[#152a45] w-full sm:w-auto"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
                    Creando...
                  </>
                ) : (
                  "Crear Rol"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Rol */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Rol</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el rol &quot;{deleteModal.rol?.nombre}&quot;?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, rol: null })} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteRol} disabled={isDeleting} className="w-full sm:w-auto">
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
                  Eliminando...
                </>
              ) : (
                "Eliminar Rol"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente separado para filas de grupo en desktop (evita re-render de toda la tabla)
function GroupRows({
  grupo,
  stats,
  allSelected,
  onToggleAll,
  getPermisoValue,
  isModuloAllSelected,
  onPermisoChange,
  onSelectAllModulo,
}: {
  grupo: typeof GRUPOS_MODULOS[0]
  stats: { total: number; activos: number } | undefined
  allSelected: boolean
  onToggleAll: (v: boolean) => void
  getPermisoValue: (modulo: string, accion: string) => boolean
  isModuloAllSelected: (modulo: string) => boolean
  onPermisoChange: (modulo: string, accion: string, value: boolean) => void
  onSelectAllModulo: (modulo: string, selectAll: boolean) => void
}) {
  return (
    <>
      {/* Fila de grupo */}
      <tr className="bg-slate-100/80">
        <td className="p-2 pl-3 font-semibold text-xs uppercase tracking-wider text-[#1e3a5f]" colSpan={ACCIONES.length + 1}>
          <div className="flex items-center gap-2">
            {grupo.grupo}
            <Badge variant="outline" className="text-[10px] font-normal">
              {stats?.activos || 0}/{stats?.total || 0}
            </Badge>
          </div>
        </td>
        <td className="text-center p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleAll(!allSelected)}
            className="h-7 px-2"
            aria-label={`${allSelected ? "Desmarcar" : "Marcar"} todos los permisos de ${grupo.grupo}`}
          >
            {allSelected ? (
              <Check className="size-4 text-green-600" aria-hidden="true" />
            ) : (
              <X className="size-4 text-gray-400" aria-hidden="true" />
            )}
          </Button>
        </td>
      </tr>
      {/* Filas de módulos */}
      {grupo.modulos.map((modulo, idx) => (
        <tr key={modulo.value} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
          <td className="p-2.5 pl-6 border-b">
            <p className="font-medium text-sm">{modulo.label}</p>
            <p className="text-[11px] text-muted-foreground">{modulo.descripcion}</p>
          </td>
          {ACCIONES.map((a) => (
            <td key={a.key} className="text-center p-2 border-b">
              <div className="flex justify-center">
                <Checkbox
                  checked={getPermisoValue(modulo.value, a.key)}
                  onCheckedChange={(v) => onPermisoChange(modulo.value, a.key, v as boolean)}
                  className="data-[state=checked]:bg-[#1e3a5f]"
                  aria-label={`${a.label} - ${modulo.label}`}
                />
              </div>
            </td>
          ))}
          <td className="text-center p-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectAllModulo(modulo.value, !isModuloAllSelected(modulo.value))}
              className="h-7 px-2"
              aria-label={`${isModuloAllSelected(modulo.value) ? "Desmarcar" : "Marcar"} todos de ${modulo.label}`}
            >
              {isModuloAllSelected(modulo.value) ? (
                <Check className="size-4 text-green-600" aria-hidden="true" />
              ) : (
                <X className="size-4 text-gray-400" aria-hidden="true" />
              )}
            </Button>
          </td>
        </tr>
      ))}
    </>
  )
}
