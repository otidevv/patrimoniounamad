"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit,
  FileDown,
  FileSpreadsheet,
  FileText,
  Key,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { exportUsuariosToExcel } from "@/lib/excel-export"

interface UsuarioRol {
  id: string
  codigo: string
  nombre: string
  color: string
}

interface Usuario {
  id: string
  email: string
  nombre: string
  apellidos: string
  tipoDocumento: string
  numeroDocumento: string | null
  cargo: string | null
  telefono: string | null
  foto: string | null
  activo: boolean
  rolId: string
  rol: UsuarioRol
  dependencia: {
    id: string
    nombre: string
    siglas: string | null
  } | null
  createdAt: string
}

interface Dependencia {
  id: string
  codigo: string
  nombre: string
  siglas: string | null
}

interface Permisos {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface RolInfo {
  id: string
  codigo: string
  nombre: string
  color: string
  esSistema: boolean
}

const TIPOS_DOCUMENTO = [
  { value: "DNI", label: "DNI" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "CARNET_EXTRANJERIA", label: "Carnet de Extranjería" },
  { value: "PTP", label: "PTP" },
  { value: "OTRO", label: "Otro" },
]

const initialFormData = {
  id: "",
  email: "",
  password: "",
  nombre: "",
  apellidos: "",
  tipoDocumento: "DNI",
  numeroDocumento: "",
  cargo: "",
  telefono: "",
  rolId: "",
  dependenciaId: "",
}

export default function UsuariosPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [roles, setRoles] = useState<RolInfo[]>([])
  const [permisos, setPermisos] = useState<Permisos>({
    ver: false,
    crear: false,
    editar: false,
    eliminar: false,
    reportes: false,
  })
  const [permisosLoaded, setPermisosLoaded] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  // Filtros
  const [search, setSearch] = useState("")
  const [filterRolId, setFilterRolId] = useState("")
  const [filterActivo, setFilterActivo] = useState("")

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState(initialFormData)

  // Modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    type: "delete" | "activate" | "resetPassword"
    usuario: Usuario | null
  }>({
    open: false,
    type: "delete",
    usuario: null,
  })

  // Modal de resetear contraseña
  const [resetPasswordModal, setResetPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")

  // Búsqueda de DNI
  const [isSearchingDni, setIsSearchingDni] = useState(false)

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search) params.append("search", search)
      if (filterRolId) params.append("rolId", filterRolId)
      if (filterActivo) params.append("activo", filterActivo)

      const response = await fetch(`/api/admin/usuarios?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsuarios(data.usuarios)
        setPagination(data.pagination)
      } else if (response.status === 401) {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      toast.error("Error al cargar usuarios")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, search, filterRolId, filterActivo, router])

  const fetchDependencias = async () => {
    try {
      const response = await fetch("/api/dependencias")
      if (response.ok) {
        const data = await response.json()
        setDependencias(data.dependencias)
      }
    } catch (error) {
      console.error("Error al cargar dependencias:", error)
    }
  }

  const fetchPermisos = async () => {
    try {
      const response = await fetch("/api/auth/permisos")
      if (response.ok) {
        const data = await response.json()
        // Obtener permisos del módulo USUARIOS
        const permisosUsuarios = data.permisos?.USUARIOS || {
          ver: false,
          crear: false,
          editar: false,
          eliminar: false,
          reportes: false,
        }
        setPermisos(permisosUsuarios)
      }
    } catch (error) {
      console.error("Error al cargar permisos:", error)
    } finally {
      setPermisosLoaded(true)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles")
      if (response.ok) {
        const data = await response.json()
        // Todos los roles vienen del API en formato unificado
        const rolesFormatted: RolInfo[] = data.roles.map((r: { id: string; codigo: string; nombre: string; color: string; esSistema: boolean }) => ({
          id: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          color: r.color,
          esSistema: r.esSistema,
        }))
        setRoles(rolesFormatted)
      }
    } catch (error) {
      console.error("Error al cargar roles:", error)
    }
  }

  const [isExporting, setIsExporting] = useState(false)

  const handleExportCSV = () => {
    // Crear CSV con los usuarios actuales
    const headers = ["Nombre", "Apellidos", "Email", "Tipo Doc.", "Num. Doc.", "Cargo", "Rol", "Dependencia", "Estado"]
    const rows = usuarios.map((u) => [
      u.nombre,
      u.apellidos,
      u.email,
      u.tipoDocumento,
      u.numeroDocumento || "",
      u.cargo || "",
      u.rol?.nombre || "Sin rol",
      u.dependencia?.nombre || "Sin asignar",
      u.activo ? "Activo" : "Inactivo",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `usuarios_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success("Reporte CSV exportado correctamente")
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      await exportUsuariosToExcel(usuarios)
      toast.success("Reporte Excel exportado correctamente")
    } catch (error) {
      console.error("Error al exportar Excel:", error)
      toast.error("Error al exportar el reporte")
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
    fetchDependencias()
    fetchPermisos()
    fetchRoles()
  }, [fetchUsuarios])

  // Búsqueda automática de DNI cuando se ingresan 8 dígitos
  useEffect(() => {
    if (
      formData.tipoDocumento === "DNI" &&
      formData.numeroDocumento.length === 8 &&
      /^\d{8}$/.test(formData.numeroDocumento) &&
      !isEditing &&
      !isSearchingDni
    ) {
      handleSearchDni()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.numeroDocumento, formData.tipoDocumento])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchUsuarios()
  }

  const handleOpenModal = (usuario?: Usuario) => {
    if (usuario) {
      setIsEditing(true)
      setFormData({
        id: usuario.id,
        email: usuario.email,
        password: "",
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        tipoDocumento: usuario.tipoDocumento || "DNI",
        numeroDocumento: usuario.numeroDocumento || "",
        cargo: usuario.cargo || "",
        telefono: usuario.telefono || "",
        rolId: usuario.rolId,
        dependenciaId: usuario.dependencia?.id || "",
      })
    } else {
      setIsEditing(false)
      // Set default rol if roles are loaded
      const defaultRol = roles.find(r => r.codigo === "USUARIO") || roles[0]
      setFormData({
        ...initialFormData,
        rolId: defaultRol?.id || "",
      })
    }
    setIsModalOpen(true)
  }

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = "/api/admin/usuarios"
      const method = isEditing ? "PUT" : "POST"

      const body = isEditing
        ? {
            id: formData.id,
            email: formData.email,
            nombre: formData.nombre,
            apellidos: formData.apellidos,
            tipoDocumento: formData.tipoDocumento,
            numeroDocumento: formData.numeroDocumento || null,
            cargo: formData.cargo || null,
            telefono: formData.telefono || null,
            rolId: formData.rolId,
            dependenciaId: formData.dependenciaId || null,
          }
        : formData

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(isEditing ? "Usuario actualizado correctamente" : "Usuario creado correctamente")
        setIsModalOpen(false)
        fetchUsuarios()
      } else {
        toast.error(data.error || "Error al guardar usuario")
      }
    } catch {
      toast.error("Error al guardar usuario")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: usuario.id,
          activo: !usuario.activo,
        }),
      })

      if (response.ok) {
        toast.success(usuario.activo ? "Usuario desactivado" : "Usuario activado")
        fetchUsuarios()
      } else {
        const data = await response.json()
        toast.error(data.error || "Error al actualizar usuario")
      }
    } catch {
      toast.error("Error al actualizar usuario")
    }
    setConfirmModal({ open: false, type: "delete", usuario: null })
  }

  const handleSearchDni = async () => {
    if (!formData.numeroDocumento || formData.numeroDocumento.length !== 8) {
      toast.error("Ingresa un DNI válido de 8 dígitos")
      return
    }

    setIsSearchingDni(true)
    try {
      const response = await fetch(`/api/consulta-dni?dni=${formData.numeroDocumento}`)
      const data = await response.json()

      if (response.ok && data.encontrado) {
        setFormData((prev) => ({
          ...prev,
          nombre: data.datos.nombre,
          apellidos: data.datos.apellidos,
        }))
        toast.success("Datos encontrados y completados")
      } else {
        toast.error(data.error || "No se encontraron datos para este DNI")
      }
    } catch {
      toast.error("Error al consultar el DNI")
    } finally {
      setIsSearchingDni(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }

    try {
      const response = await fetch("/api/admin/usuarios/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          newPassword,
        }),
      })

      if (response.ok) {
        toast.success("Contraseña restablecida correctamente")
        setResetPasswordModal(false)
        setNewPassword("")
        setSelectedUserId("")
      } else {
        const data = await response.json()
        toast.error(data.error || "Error al restablecer contraseña")
      }
    } catch {
      toast.error("Error al restablecer contraseña")
    }
  }

  const getRolBadge = (usuarioRol: UsuarioRol | undefined) => {
    if (!usuarioRol) {
      return (
        <Badge className="bg-gray-500 text-white">
          Sin rol
        </Badge>
      )
    }
    return (
      <Badge
        className="text-white"
        style={{ backgroundColor: usuarioRol.color }}
      >
        {usuarioRol.nombre}
      </Badge>
    )
  }

  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase()
  }

  // Mostrar loading mientras se cargan los permisos
  if (!permisosLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Verificar permiso de ver
  if (!permisos.ver) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldAlert className="size-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">
                Acceso Denegado
              </h2>
              <p className="text-red-600 mb-6">
                No tienes permisos para ver esta sección.
              </p>
              <Link href="/dashboard">
                <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-100">
                  <ArrowLeft className="size-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
              <Users className="size-5 md:size-6 shrink-0" />
              <span className="truncate">Gestión de Usuarios</span>
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Administra los usuarios del sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          {permisos.reportes && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={usuarios.length === 0 || isExporting}
                  className="flex-1 sm:flex-none"
                >
                  {isExporting ? (
                    <Loader2 className="size-4 sm:mr-2 animate-spin" />
                  ) : (
                    <FileDown className="size-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="size-4 mr-2 text-green-600" />
                  Exportar a Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="size-4 mr-2 text-blue-600" />
                  Exportar a CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {permisos.crear && (
            <Button
              size="sm"
              onClick={() => handleOpenModal()}
              className="bg-[#1e3a5f] hover:bg-[#152a45] flex-1 sm:flex-none"
            >
              <Plus className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Usuario</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <form onSubmit={handleSearch} className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:gap-4">
            <div className="flex-1 min-w-0 md:min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o documento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:gap-4">
              <Select value={filterRolId} onValueChange={setFilterRolId}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {roles.map((rol) => (
                    <SelectItem key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterActivo} onValueChange={setFilterActivo}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="secondary" className="w-full md:w-auto">
              <Search className="size-4 mr-2" />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({pagination.total})</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios
            </div>
          ) : (
            <>
              {/* Vista de tabla para desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Dependencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-10">
                              {usuario.foto && <AvatarImage src={usuario.foto} />}
                              <AvatarFallback className="bg-[#1e3a5f] text-white">
                                {getInitials(usuario.nombre, usuario.apellidos)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {usuario.nombre} {usuario.apellidos}
                              </p>
                              {usuario.numeroDocumento && (
                                <p className="text-sm text-muted-foreground">
                                  {TIPOS_DOCUMENTO.find(t => t.value === usuario.tipoDocumento)?.label || usuario.tipoDocumento}: {usuario.numeroDocumento}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>{getRolBadge(usuario.rol)}</TableCell>
                        <TableCell>
                          {usuario.dependencia?.nombre || (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {usuario.activo ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Check className="size-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              <X className="size-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(permisos.editar || permisos.eliminar) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {permisos.editar && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleOpenModal(usuario)}>
                                      <Edit className="size-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUserId(usuario.id)
                                        setResetPasswordModal(true)
                                      }}
                                    >
                                      <Key className="size-4 mr-2" />
                                      Resetear Contraseña
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {permisos.eliminar && (
                                  <>
                                    {permisos.editar && <DropdownMenuSeparator />}
                                    {usuario.activo ? (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setConfirmModal({
                                            open: true,
                                            type: "delete",
                                            usuario,
                                          })
                                        }
                                        className="text-red-600"
                                      >
                                        <UserX className="size-4 mr-2" />
                                        Desactivar
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setConfirmModal({
                                            open: true,
                                            type: "activate",
                                            usuario,
                                          })
                                        }
                                        className="text-green-600"
                                      >
                                        <UserCheck className="size-4 mr-2" />
                                        Activar
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista de tarjetas para mobile */}
              <div className="md:hidden space-y-3">
                {usuarios.map((usuario) => (
                  <div
                    key={usuario.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="size-12 shrink-0">
                          {usuario.foto && <AvatarImage src={usuario.foto} />}
                          <AvatarFallback className="bg-[#1e3a5f] text-white">
                            {getInitials(usuario.nombre, usuario.apellidos)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {usuario.nombre} {usuario.apellidos}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {usuario.email}
                          </p>
                        </div>
                      </div>
                      {(permisos.editar || permisos.eliminar) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {permisos.editar && (
                              <>
                                <DropdownMenuItem onClick={() => handleOpenModal(usuario)}>
                                  <Edit className="size-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUserId(usuario.id)
                                    setResetPasswordModal(true)
                                  }}
                                >
                                  <Key className="size-4 mr-2" />
                                  Resetear Contraseña
                                </DropdownMenuItem>
                              </>
                            )}
                            {permisos.eliminar && (
                              <>
                                {permisos.editar && <DropdownMenuSeparator />}
                                {usuario.activo ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmModal({
                                        open: true,
                                        type: "delete",
                                        usuario,
                                      })
                                    }
                                    className="text-red-600"
                                  >
                                    <UserX className="size-4 mr-2" />
                                    Desactivar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setConfirmModal({
                                        open: true,
                                        type: "activate",
                                        usuario,
                                      })
                                    }
                                    className="text-green-600"
                                  >
                                    <UserCheck className="size-4 mr-2" />
                                    Activar
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Detalles de la tarjeta */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {usuario.numeroDocumento && (
                        <div>
                          <span className="text-muted-foreground">
                            {TIPOS_DOCUMENTO.find(t => t.value === usuario.tipoDocumento)?.label || usuario.tipoDocumento}:
                          </span>{" "}
                          <span className="font-medium">{usuario.numeroDocumento}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Dependencia:</span>{" "}
                        <span className="font-medium">
                          {usuario.dependencia?.siglas || usuario.dependencia?.nombre || "Sin asignar"}
                        </span>
                      </div>
                    </div>

                    {/* Footer con badges */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      {getRolBadge(usuario.rol)}
                      {usuario.activo ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Check className="size-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <X className="size-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación responsive */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center sm:text-left">
                    <span className="hidden sm:inline">Mostrando </span>
                    {(pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                    <span className="hidden sm:inline"> de</span>
                    <span className="sm:hidden">/</span> {pagination.total}
                    <span className="hidden sm:inline"> usuarios</span>
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm min-w-[80px] text-center">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Crear/Editar Usuario */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription className="hidden sm:block">
              {isEditing
                ? "Modifica los datos del usuario"
                : "Completa los datos para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUsuario}>
            <div className="grid gap-4 py-4">
              {/* Tipo y Número de Documento - Primero para autocompletar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento">Tipo de Documento</Label>
                  <Select
                    value={formData.tipoDocumento}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipoDocumento: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DOCUMENTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroDocumento" className="flex flex-wrap items-center gap-1">
                    <span>Número de Documento</span>
                    {formData.tipoDocumento === "DNI" && !isEditing && (
                      <span className="text-xs text-muted-foreground">
                        (autocompleta)
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="numeroDocumento"
                      value={formData.numeroDocumento}
                      onChange={(e) =>
                        setFormData({ ...formData, numeroDocumento: e.target.value.replace(/\D/g, "") })
                      }
                      maxLength={formData.tipoDocumento === "DNI" ? 8 : 20}
                      placeholder={formData.tipoDocumento === "DNI" ? "8 dígitos" : "Número"}
                    />
                    {isSearchingDni && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nombre y Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) =>
                      setFormData({ ...formData, apellidos: e.target.value })
                    }
                    required
                    placeholder="Apellidos"
                  />
                </div>
              </div>

              {/* Email y Contraseña */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                {!isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={!isEditing}
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                )}
              </div>

              {/* Teléfono y Cargo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    placeholder="999 999 999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo: e.target.value })
                    }
                    placeholder="Cargo del usuario"
                  />
                </div>
              </div>

              {/* Rol y Dependencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <Select
                    value={formData.rolId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, rolId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((rol) => (
                        <SelectItem key={rol.id} value={rol.id}>
                          {rol.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dependencia">Dependencia</Label>
                  <Select
                    value={formData.dependenciaId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, dependenciaId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona dependencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {dependencias.map((dep) => (
                        <SelectItem key={dep.id} value={dep.id}>
                          {dep.siglas || dep.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#1e3a5f] hover:bg-[#152a45] w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>{isEditing ? "Actualizar" : "Crear"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación */}
      <Dialog
        open={confirmModal.open}
        onOpenChange={(open) =>
          setConfirmModal({ ...confirmModal, open })
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmModal.type === "delete"
                ? "Desactivar Usuario"
                : "Activar Usuario"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {confirmModal.type === "delete"
                ? `¿Desactivar a ${confirmModal.usuario?.nombre} ${confirmModal.usuario?.apellidos}? No podrá acceder al sistema.`
                : `¿Activar a ${confirmModal.usuario?.nombre} ${confirmModal.usuario?.apellidos}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmModal({ open: false, type: "delete", usuario: null })
              }
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant={confirmModal.type === "delete" ? "destructive" : "default"}
              onClick={() =>
                confirmModal.usuario && handleToggleActivo(confirmModal.usuario)
              }
              className="w-full sm:w-auto"
            >
              {confirmModal.type === "delete" ? "Desactivar" : "Activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Resetear Contraseña */}
      <Dialog open={resetPasswordModal} onOpenChange={setResetPasswordModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription className="text-sm">
              Ingresa la nueva contraseña
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordModal(false)
                setNewPassword("")
                setSelectedUserId("")
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              className="bg-[#1e3a5f] hover:bg-[#152a45] w-full sm:w-auto"
            >
              Restablecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
