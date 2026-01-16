"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// Colores disponibles para nuevos roles
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

const MODULOS = [
  { value: "DASHBOARD", label: "Dashboard", descripcion: "Panel principal del sistema" },
  { value: "BIENES", label: "Bienes Patrimoniales", descripcion: "Gestión de bienes" },
  { value: "INVENTARIO", label: "Inventario", descripcion: "Control de inventario" },
  { value: "ALTAS", label: "Altas de Bienes", descripcion: "Registro de nuevos bienes" },
  { value: "BAJAS", label: "Bajas de Bienes", descripcion: "Dar de baja bienes" },
  { value: "TRANSFERENCIAS", label: "Transferencias", descripcion: "Transferir bienes entre dependencias" },
  { value: "CATEGORIAS", label: "Categorías", descripcion: "Catálogo de categorías" },
  { value: "DEPENDENCIAS", label: "Dependencias", descripcion: "Unidades orgánicas" },
  { value: "RESPONSABLES", label: "Responsables", descripcion: "Gestión de responsables" },
  { value: "REPORTES", label: "Reportes", descripcion: "Generación de reportes" },
  { value: "DOCUMENTOS", label: "Documentos", descripcion: "Gestión documental" },
  { value: "ADMIN_PANEL", label: "Panel de Administración", descripcion: "Acceso al panel de administración" },
  { value: "ROLES_PERMISOS", label: "Roles y Permisos", descripcion: "Gestión de roles y permisos" },
  { value: "USUARIOS", label: "Usuarios", descripcion: "Administración de usuarios" },
  { value: "CONFIGURACION", label: "Configuración", descripcion: "Configuración del sistema" },
]

const ACCIONES = [
  { key: "ver", label: "Ver", descripcion: "Visualizar información" },
  { key: "crear", label: "Crear", descripcion: "Agregar nuevos registros" },
  { key: "editar", label: "Editar", descripcion: "Modificar registros" },
  { key: "eliminar", label: "Eliminar", descripcion: "Eliminar registros" },
  { key: "reportes", label: "Reportes", descripcion: "Generar reportes" },
]

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

  // Estado para roles dinámicos (todos vienen del API)
  const [roles, setRoles] = useState<RolInfo[]>([])

  // Estado para el modal de crear rol
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState(initialFormData)

  // Estado para el modal de eliminar rol
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; rol: RolInfo | null }>({
    open: false,
    rol: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Obtener el rol seleccionado actualmente
  const selectedRol = roles.find(r => r.id === selectedRolId)

  useEffect(() => {
    fetchUserData()
  }, [])

  // Cargar roles cuando tengamos permisos
  useEffect(() => {
    if (permisosModulo?.ver) {
      fetchRoles()
    }
  }, [permisosModulo])

  // Cargar permisos cuando se seleccione un rol
  useEffect(() => {
    if (permisosModulo?.ver && selectedRolId) {
      fetchPermisos()
    }
  }, [permisosModulo, selectedRolId])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)

        // Obtener permisos del usuario para este módulo
        const permisosResponse = await fetch("/api/auth/permisos")
        if (permisosResponse.ok) {
          const permisosData = await permisosResponse.json()
          const permisoRoles = permisosData.permisos?.ROLES_PERMISOS

          // Admin siempre tiene acceso
          if (data.user.rol === "ADMIN") {
            setPermisosModulo({ ver: true, crear: true, editar: true, eliminar: true, reportes: true })
          } else if (permisoRoles?.ver) {
            setPermisosModulo(permisoRoles)
          } else {
            toast.error("No tienes permisos para acceder a esta sección")
            router.push("/dashboard")
          }
        }
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Error al cargar usuario:", error)
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
        // Asegurar que todos los módulos tengan permisos
        const permisosCompletos = MODULOS.map((modulo) => {
          const existing = data.permisos.find((p: Permiso) => p.modulo === modulo.value)
          return existing || {
            rolId: selectedRolId,
            modulo: modulo.value,
            ver: false,
            crear: false,
            editar: false,
            eliminar: false,
            reportes: false,
          }
        })
        setPermisos(permisosCompletos)
      }
    } catch (error) {
      console.error("Error al cargar permisos:", error)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles")
      if (response.ok) {
        const data = await response.json()
        // Todos los roles vienen del API en formato unificado
        const rolesFormatted: RolInfo[] = data.roles.map((rol: { id: string; codigo: string; nombre: string; color: string; descripcion?: string; esSistema: boolean }) => ({
          id: rol.id,
          codigo: rol.codigo,
          nombre: rol.nombre,
          color: rol.color,
          descripcion: rol.descripcion,
          esSistema: rol.esSistema,
        }))
        setRoles(rolesFormatted)
        // Seleccionar el primer rol si no hay uno seleccionado
        if (!selectedRolId && rolesFormatted.length > 0) {
          setSelectedRolId(rolesFormatted[0].id)
        }
      }
    } catch (error) {
      console.error("Error al cargar roles:", error)
    }
  }

  // Convertir color hex a clase de Tailwind
  const getColorClass = (hexColor: string): string => {
    const colorMap: Record<string, string> = {
      "#ef4444": "bg-red-500",
      "#f97316": "bg-orange-500",
      "#eab308": "bg-yellow-500",
      "#22c55e": "bg-green-500",
      "#14b8a6": "bg-teal-500",
      "#3b82f6": "bg-blue-500",
      "#8b5cf6": "bg-violet-500",
      "#ec4899": "bg-pink-500",
      "#6b7280": "bg-gray-500",
    }
    return colorMap[hexColor] || "bg-gray-500"
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
      const response = await fetch(`/api/admin/roles?id=${deleteModal.rol.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Rol eliminado correctamente")
        setDeleteModal({ open: false, rol: null })
        // Si el rol eliminado era el seleccionado, seleccionar el primer rol disponible
        if (selectedRolId === deleteModal.rol.id) {
          const remainingRoles = roles.filter(r => r.id !== deleteModal.rol!.id)
          if (remainingRoles.length > 0) {
            setSelectedRolId(remainingRoles[0].id)
          } else {
            setSelectedRolId("")
          }
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

  const handlePermisoChange = (modulo: string, accion: string, value: boolean) => {
    setPermisos((prev) => {
      const existing = prev.find((p) => p.modulo === modulo)
      if (existing) {
        return prev.map((p) =>
          p.modulo === modulo ? { ...p, [accion]: value } : p
        )
      } else {
        return [
          ...prev,
          {
            rolId: selectedRolId,
            modulo,
            ver: accion === "ver" ? value : false,
            crear: accion === "crear" ? value : false,
            editar: accion === "editar" ? value : false,
            eliminar: accion === "eliminar" ? value : false,
            reportes: accion === "reportes" ? value : false,
          },
        ]
      }
    })
  }

  const handleSelectAllModulo = (modulo: string, selectAll: boolean) => {
    setPermisos((prev) => {
      const existing = prev.find((p) => p.modulo === modulo)
      const newPermiso = {
        rolId: selectedRolId,
        modulo,
        ver: selectAll,
        crear: selectAll,
        editar: selectAll,
        eliminar: selectAll,
        reportes: selectAll,
      }
      if (existing) {
        return prev.map((p) => (p.modulo === modulo ? newPermiso : p))
      } else {
        return [...prev, newPermiso]
      }
    })
  }

  const handleSelectAllAccion = (accion: string, selectAll: boolean) => {
    setPermisos((prev) => {
      const newPermisos = MODULOS.map((modulo) => {
        const existing = prev.find((p) => p.modulo === modulo.value)
        if (existing) {
          return { ...existing, [accion]: selectAll }
        } else {
          return {
            rolId: selectedRolId,
            modulo: modulo.value,
            ver: accion === "ver" ? selectAll : false,
            crear: accion === "crear" ? selectAll : false,
            editar: accion === "editar" ? selectAll : false,
            eliminar: accion === "eliminar" ? selectAll : false,
            reportes: accion === "reportes" ? selectAll : false,
          }
        }
      })
      return newPermisos
    })
  }

  const getPermisoValue = (modulo: string, accion: string): boolean => {
    const permiso = permisos.find((p) => p.modulo === modulo)
    if (!permiso) return false
    return permiso[accion as keyof Permiso] as boolean
  }

  const isModuloAllSelected = (modulo: string): boolean => {
    const permiso = permisos.find((p) => p.modulo === modulo)
    if (!permiso) return false
    return permiso.ver && permiso.crear && permiso.editar && permiso.eliminar && permiso.reportes
  }

  const isAccionAllSelected = (accion: string): boolean => {
    return MODULOS.every((modulo) => getPermisoValue(modulo.value, accion))
  }

  const handleSavePermisos = async () => {
    if (!selectedRolId) {
      toast.error("Selecciona un rol primero")
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/permisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolId: selectedRolId, permisos }),
      })

      if (response.ok) {
        toast.success("Permisos guardados correctamente", {
          description: "Los usuarios con este rol verán los cambios al recargar la página o volver a iniciar sesión.",
        })
        // Recargar permisos después de guardar
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!permisosModulo?.ver) {
    return null
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4 flex-1">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
              <Shield className="size-5 md:size-6 shrink-0" />
              <span className="truncate">Roles y Permisos</span>
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Define qué acciones puede realizar cada rol en cada módulo
            </p>
          </div>
        </div>
        {permisosModulo?.crear && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1e3a5f] hover:bg-[#152a45] w-full sm:w-auto"
          >
            <Plus className="size-4 mr-2" />
            Nuevo Rol
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="text-lg md:text-xl">Selecciona un Rol</CardTitle>
          <CardDescription className="hidden sm:block">
            Configura los permisos para el rol seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <Tabs value={selectedRolId} onValueChange={setSelectedRolId}>
            <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
              {roles.map((rol) => (
                <TabsTrigger
                  key={rol.id}
                  value={rol.id}
                  className="gap-1.5 py-2 px-3 text-xs sm:text-sm"
                >
                  <div
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: rol.color }}
                  />
                  <span className="truncate">{rol.nombre}</span>
                  {!rol.esSistema && (
                    <span className="text-[10px] text-muted-foreground">(P)</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {roles.map((rol) => (
              <TabsContent key={rol.id} value={rol.id} className="mt-4 md:mt-6">
                <div className="space-y-4">
                  {/* Header con badge y botones */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: rol.color }}
                      >
                        {rol.nombre}
                      </Badge>
                      {!rol.esSistema && (
                        <Badge variant="outline" className="text-xs">
                          Personalizado
                        </Badge>
                      )}
                      {rol.esSistema && (
                        <Badge variant="secondary" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        - Configurando permisos
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!rol.esSistema && permisosModulo?.eliminar && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteModal({ open: true, rol })}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="size-4 sm:mr-2" />
                          <span className="hidden sm:inline">Eliminar Rol</span>
                        </Button>
                      )}
                      <Button
                        onClick={handleSavePermisos}
                        disabled={isSaving}
                        className="bg-[#1e3a5f] hover:bg-[#152a45] flex-1 sm:flex-none"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            <span className="hidden sm:inline">Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="size-4 sm:mr-2" />
                            <span className="hidden sm:inline">Guardar Permisos</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Tabla de permisos - Desktop */}
                  <div className="hidden md:block border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-3 font-medium border-b w-64">
                              Módulo
                            </th>
                            {ACCIONES.map((accion) => (
                              <th
                                key={accion.key}
                                className="text-center p-3 font-medium border-b w-24"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span>{accion.label}</span>
                                  <Checkbox
                                    checked={isAccionAllSelected(accion.key)}
                                    onCheckedChange={(checked) =>
                                      handleSelectAllAccion(accion.key, checked as boolean)
                                    }
                                    className="data-[state=checked]:bg-[#1e3a5f]"
                                  />
                                </div>
                              </th>
                            ))}
                            <th className="text-center p-3 font-medium border-b w-24">
                              Todos
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {MODULOS.map((modulo, index) => (
                            <tr
                              key={modulo.value}
                              className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                            >
                              <td className="p-3 border-b">
                                <div>
                                  <p className="font-medium">{modulo.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {modulo.descripcion}
                                  </p>
                                </div>
                              </td>
                              {ACCIONES.map((accion) => (
                                <td
                                  key={accion.key}
                                  className="text-center p-3 border-b"
                                >
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={getPermisoValue(modulo.value, accion.key)}
                                      onCheckedChange={(checked) =>
                                        handlePermisoChange(
                                          modulo.value,
                                          accion.key,
                                          checked as boolean
                                        )
                                      }
                                      className="data-[state=checked]:bg-[#1e3a5f]"
                                    />
                                  </div>
                                </td>
                              ))}
                              <td className="text-center p-3 border-b">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleSelectAllModulo(
                                      modulo.value,
                                      !isModuloAllSelected(modulo.value)
                                    )
                                  }
                                  className="h-8 px-2"
                                >
                                  {isModuloAllSelected(modulo.value) ? (
                                    <Check className="size-4 text-green-600" />
                                  ) : (
                                    <X className="size-4 text-gray-400" />
                                  )}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Vista de tarjetas - Mobile */}
                  <div className="md:hidden space-y-3">
                    {MODULOS.map((modulo) => (
                      <div
                        key={modulo.value}
                        className="border rounded-lg p-3 space-y-3"
                      >
                        {/* Header de la tarjeta */}
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{modulo.label}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {modulo.descripcion}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleSelectAllModulo(
                                modulo.value,
                                !isModuloAllSelected(modulo.value)
                              )
                            }
                            className="h-8 px-2 shrink-0"
                          >
                            {isModuloAllSelected(modulo.value) ? (
                              <Check className="size-4 text-green-600" />
                            ) : (
                              <X className="size-4 text-gray-400" />
                            )}
                          </Button>
                        </div>

                        {/* Checkboxes de permisos */}
                        <div className="grid grid-cols-5 gap-1">
                          {ACCIONES.map((accion) => (
                            <div
                              key={accion.key}
                              className="flex flex-col items-center gap-1"
                            >
                              <Checkbox
                                checked={getPermisoValue(modulo.value, accion.key)}
                                onCheckedChange={(checked) =>
                                  handlePermisoChange(
                                    modulo.value,
                                    accion.key,
                                    checked as boolean
                                  )
                                }
                                className="data-[state=checked]:bg-[#1e3a5f]"
                              />
                              <span className="text-[10px] text-muted-foreground">
                                {accion.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Leyenda - solo en desktop */}
                  <div className="hidden md:flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {ACCIONES.map((accion) => (
                      <div key={accion.key} className="flex items-center gap-1">
                        <div className="size-3 rounded bg-[#1e3a5f]" />
                        <span>
                          <strong>{accion.label}:</strong> {accion.descripcion}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Crear Rol */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Rol</DialogTitle>
            <DialogDescription>
              Crea un nuevo rol personalizado para el sistema
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRol}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })
                  }
                  placeholder="Ej: AUDITOR, INVENTARIADOR"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras mayúsculas, números y guiones bajos
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Auditor, Inventariador"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del rol"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORES_DISPONIBLES.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`size-8 rounded-full ${color.class} transition-all ${
                        formData.color === color.value
                          ? "ring-2 ring-offset-2 ring-[#1e3a5f]"
                          : "hover:scale-110"
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false)
                  setFormData(initialFormData)
                }}
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
                    <Loader2 className="size-4 mr-2 animate-spin" />
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

      {/* Modal de Eliminar Rol */}
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
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, rol: null })}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRol}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
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
