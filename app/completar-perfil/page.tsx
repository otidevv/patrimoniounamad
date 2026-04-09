"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Loader2, Save, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CompletarPerfilPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
    cargo: "",
    telefono: "",
  })

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
          setFormData((prev) => ({
            ...prev,
            nombre: data.user.nombre || "",
            apellidos: data.user.apellidos || "",
            tipoDocumento: data.user.tipoDocumento || "DNI",
            numeroDocumento: data.user.numeroDocumento || "",
            cargo: data.user.cargo || "",
            telefono: data.user.telefono || "",
          }))
        }
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!formData.numeroDocumento.trim()) {
      setError("El número de documento es obligatorio")
      setIsLoading(false)
      return
    }

    if (!formData.nombre.trim() || !formData.apellidos.trim()) {
      setError("Nombre y apellidos son obligatorios")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/completar-perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar")
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <Image
            src="/logos/logo_single_min.png"
            alt="UNAMAD"
            width={64}
            height={64}
            className="h-16 w-auto"
          />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <UserCircle className="size-12 text-[#1e3a5f]" />
            </div>
            <CardTitle className="text-xl text-[#1e3a5f]">
              Completar Perfil
            </CardTitle>
            <CardDescription>
              Para continuar, complete sus datos personales. Esta información es necesaria para el uso del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {user?.email && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                  Sesión iniciada como: <strong>{user.email}</strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="nombre" className="text-sm font-medium">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="apellidos" className="text-sm font-medium">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="apellidos"
                    value={formData.apellidos}
                    onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="tipoDocumento" className="text-sm font-medium">
                    Tipo de Documento
                  </label>
                  <Select
                    value={formData.tipoDocumento}
                    onValueChange={(val) => setFormData({ ...formData, tipoDocumento: val })}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="tipoDocumento">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      <SelectItem value="CARNET_EXTRANJERIA">Carnet de Extranjería</SelectItem>
                      <SelectItem value="PTP">PTP</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="numeroDocumento" className="text-sm font-medium">
                    N° de Documento <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="numeroDocumento"
                    placeholder="Ej: 12345678"
                    value={formData.numeroDocumento}
                    onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="cargo" className="text-sm font-medium">
                    Cargo
                  </label>
                  <Input
                    id="cargo"
                    placeholder="Ej: Técnico administrativo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="telefono" className="text-sm font-medium">
                    Teléfono
                  </label>
                  <Input
                    id="telefono"
                    placeholder="Ej: 987654321"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#db0455] hover:bg-[#c20449] text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Guardar y Continuar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
