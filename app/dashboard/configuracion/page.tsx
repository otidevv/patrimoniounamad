"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  Bell,
  Eye,
  Globe,
  Loader2,
  Moon,
  Palette,
  Save,
  Sun,
  Monitor,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UserSettings {
  theme: string
  notificacionesEmail: boolean
  notificacionesPush: boolean
  idioma: string
  vistaCompacta: boolean
  mostrarEstado: boolean
  mostrarActividad: boolean
}

const defaultSettings: UserSettings = {
  theme: "light",
  notificacionesEmail: true,
  notificacionesPush: true,
  idioma: "es",
  vistaCompacta: false,
  mostrarEstado: true,
  mostrarActividad: true,
}

export default function ConfiguracionPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setMounted(true)

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/auth/configuracion")
        if (response.ok) {
          const data = await response.json()
          const config = data.configuracion
          setSettings({
            theme: config.theme,
            notificacionesEmail: config.notificacionesEmail,
            notificacionesPush: config.notificacionesPush,
            idioma: config.idioma,
            vistaCompacta: config.vistaCompacta,
            mostrarEstado: config.mostrarEstado,
            mostrarActividad: config.mostrarActividad,
          })
          // Solo sincronizar tema con next-themes en la carga inicial
          setTheme(config.theme)
        }
      } catch (error) {
        console.error("Error al cargar configuración:", error)
        toast.error("Error al cargar la configuración")
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    setSettings(prev => ({ ...prev, theme: newTheme }))
    setHasChanges(true)
  }

  const handleSettingChange = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/auth/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast.success("Configuración guardada correctamente")
        setHasChanges(false)
      } else {
        const data = await response.json()
        toast.error(data.error || "Error al guardar la configuración")
      }
    } catch {
      toast.error("Error al guardar la configuración")
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f] dark:text-white">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu experiencia en el sistema</p>
      </div>

      {/* Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            Apariencia
          </CardTitle>
          <CardDescription>Personaliza cómo se ve el sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Tema</Label>
            {mounted ? (
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "light"
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <Sun className="size-6" />
                  <span className="text-sm font-medium">Claro</span>
                </button>
                <button
                  onClick={() => handleThemeChange("dark")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "dark"
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <Moon className="size-6" />
                  <span className="text-sm font-medium">Oscuro</span>
                </button>
                <button
                  onClick={() => handleThemeChange("system")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "system"
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <Monitor className="size-6" />
                  <span className="text-sm font-medium">Sistema</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 animate-pulse"
                  >
                    <div className="size-6 bg-gray-200 rounded" />
                    <div className="h-4 w-12 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vista-compacta">Vista compacta</Label>
              <p className="text-sm text-muted-foreground">
                Reduce el espaciado para ver más contenido
              </p>
            </div>
            <Switch
              id="vista-compacta"
              checked={settings.vistaCompacta}
              onCheckedChange={(checked) =>
                handleSettingChange("vistaCompacta", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Notificaciones
          </CardTitle>
          <CardDescription>Configura cómo recibir alertas y avisos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-email">Notificaciones por correo</Label>
              <p className="text-sm text-muted-foreground">
                Recibe alertas importantes en tu correo electrónico
              </p>
            </div>
            <Switch
              id="notif-email"
              checked={settings.notificacionesEmail}
              onCheckedChange={(checked) =>
                handleSettingChange("notificacionesEmail", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-push">Notificaciones en el navegador</Label>
              <p className="text-sm text-muted-foreground">
                Muestra notificaciones en tiempo real mientras usas el sistema
              </p>
            </div>
            <Switch
              id="notif-push"
              checked={settings.notificacionesPush}
              onCheckedChange={(checked) =>
                handleSettingChange("notificacionesPush", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Idioma y Región */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Idioma y Región
          </CardTitle>
          <CardDescription>Configura tu idioma preferido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="idioma">Idioma del sistema</Label>
            <Select
              value={settings.idioma}
              onValueChange={(value) => handleSettingChange("idioma", value)}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Selecciona un idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español (Perú)</SelectItem>
                <SelectItem value="en" disabled>English (próximamente)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacidad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-5" />
            Privacidad
          </CardTitle>
          <CardDescription>Controla la visibilidad de tu información</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mostrar mi estado de conexión</Label>
              <p className="text-sm text-muted-foreground">
                Permite que otros usuarios vean cuando estás en línea
              </p>
            </div>
            <Switch
              checked={settings.mostrarEstado}
              onCheckedChange={(checked) =>
                handleSettingChange("mostrarEstado", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mostrar mi actividad reciente</Label>
              <p className="text-sm text-muted-foreground">
                Muestra tus acciones recientes en el sistema
              </p>
            </div>
            <Switch
              checked={settings.mostrarActividad}
              onCheckedChange={(checked) =>
                handleSettingChange("mostrarActividad", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <p className="text-sm text-amber-600 dark:text-amber-400 self-center">
            Tienes cambios sin guardar
          </p>
        )}
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving || !hasChanges}
          className="bg-[#1e3a5f] hover:bg-[#152a45]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
