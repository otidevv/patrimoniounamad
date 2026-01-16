"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Building2,
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  User,
  IdCard,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface UserProfile {
  id: string
  email: string
  nombre: string
  apellidos: string
  tipoDocumento: string
  numeroDocumento: string | null
  cargo: string | null
  telefono: string | null
  foto: string | null
  rol: string
  dependencia: {
    id: string
    nombre: string
    siglas: string | null
  } | null
  createdAt: string
}

const TIPOS_DOCUMENTO: Record<string, string> = {
  DNI: "DNI",
  PASAPORTE: "Pasaporte",
  CARNET_EXTRANJERIA: "Carnet de Extranjería",
  PTP: "PTP",
  OTRO: "Otro",
}

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
          nombre: data.user.nombre,
          apellidos: data.user.apellidos,
          telefono: data.user.telefono || "",
        })
      }
    } catch (error) {
      console.error("Error al cargar perfil:", error)
      toast.error("Error al cargar el perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Perfil actualizado correctamente")
        setUser(data.user)
        router.refresh()
      } else {
        toast.error(data.error || "Error al actualizar el perfil")
      }
    } catch {
      toast.error("Error al actualizar el perfil")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChangingPassword(true)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      setIsChangingPassword(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      setIsChangingPassword(false)
      return
    }

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Contraseña cambiada correctamente")
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        toast.error(data.error || "Error al cambiar la contraseña")
      }
    } catch {
      toast.error("Error al cambiar la contraseña")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    const formData = new FormData()
    formData.append("foto", file)

    try {
      const response = await fetch("/api/auth/upload-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok) {
        setUser((prev) => prev ? { ...prev, foto: data.foto } : null)
        toast.success("Foto actualizada correctamente")
        router.refresh()
      } else {
        toast.error(data.error || "Error al subir la foto")
      }
    } catch {
      toast.error("Error al subir la foto")
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const getInitials = () => {
    if (user) {
      return `${user.nombre.charAt(0)}${user.apellidos.charAt(0)}`.toUpperCase()
    }
    return "US"
  }

  const getRolLabel = (rol: string) => {
    const roles: Record<string, string> = {
      ADMIN: "Administrador",
      JEFE_PATRIMONIO: "Jefe de Patrimonio",
      RESPONSABLE: "Responsable",
      USUARIO: "Usuario",
    }
    return roles[rol] || rol
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal y seguridad</p>
      </div>

      {/* Información del perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Tu información de cuenta y perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Foto de perfil */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="size-32 border-4 border-white shadow-lg">
                  {user?.foto && <AvatarImage src={user.foto} alt={user.nombre} />}
                  <AvatarFallback className="bg-[#1e3a5f] text-white text-3xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="photo-upload"
                  className={`absolute bottom-0 right-0 flex items-center justify-center size-10 rounded-full bg-[#db0455] text-white cursor-pointer hover:bg-[#c20449] transition-colors shadow-lg ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Camera className="size-5" />
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadPhoto}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="bg-[#1e3a5f] text-white">
                  {getRolLabel(user?.rol || "")}
                </Badge>
              </div>
            </div>

            {/* Datos del usuario */}
            <div className="flex-1 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Mail className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Correo electrónico</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <IdCard className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {TIPOS_DOCUMENTO[user?.tipoDocumento || "DNI"] || "Documento"}
                    </p>
                    <p className="font-medium">{user?.numeroDocumento || "No registrado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Briefcase className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="font-medium">{user?.cargo || "No registrado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <Building2 className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dependencia</p>
                    <p className="font-medium">{user?.dependencia?.nombre || "No asignada"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editar perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Perfil</CardTitle>
          <CardDescription>Actualiza tu información personal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellidos</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="pl-10"
                    placeholder="999 999 999"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="bg-[#1e3a5f] hover:bg-[#152a45]">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña actual</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Separator />
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isChangingPassword}
                variant="outline"
                className="border-[#db0455] text-[#db0455] hover:bg-[#db0455] hover:text-white"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 size-4" />
                    Cambiar Contraseña
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
