"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, CheckCircle, Eye, EyeOff, Key, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState("")
  const [userName, setUserName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (!token) {
      setTokenError("No se proporcionó un token de recuperación")
      setIsLoading(false)
      return
    }

    // Verificar token
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password-token?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          setTokenError(data.error || "Token inválido")
          setTokenValid(false)
        } else {
          setTokenValid(true)
          setUserName(data.user.nombre)
        }
      } catch {
        setTokenError("Error al verificar el token")
        setTokenValid(false)
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/reset-password-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al restablecer la contraseña")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar gobierno */}
      <div className="bg-[#6f7271] text-white py-1">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logos/gobpe_min.jpg"
              alt="Gobierno del Perú"
              width={24}
              height={24}
              className="h-5 w-auto rounded-sm"
            />
            <span className="text-xs hidden sm:inline">gob.pe</span>
          </div>
          <span className="text-xs opacity-80">
            Plataforma digital única del Estado Peruano
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <Image
                src="/logos/logo_single_min.png"
                alt="UNAMAD"
                width={48}
                height={48}
                className="h-10 sm:h-12 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-tight">
                  SISTEMA DE GESTIÓN PATRIMONIAL
                </h1>
                <p className="text-sm text-white/80">
                  Universidad Nacional Amazónica de Madre de Dios
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-bold leading-tight">
                  SIGA PATRIMONIO
                </h1>
                <p className="text-xs text-white/80">
                  UNAMAD
                </p>
              </div>
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative flex items-center justify-center p-4">
        <div className="absolute inset-0">
          <Image
            src="/banners/5.jpg"
            alt="UNAMAD Campus"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/80 via-[#1e3a5f]/70 to-[#1e3a5f]/80" />
        </div>

        <div className="relative w-full max-w-md">
          <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95 text-gray-900">
            {isLoading ? (
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="size-10 animate-spin text-[#1e3a5f]" />
                  <p className="text-gray-600">Verificando enlace...</p>
                </div>
              </CardContent>
            ) : !tokenValid ? (
              <>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center justify-center size-16 rounded-full bg-red-100">
                      <XCircle className="size-8 text-red-600" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-red-600">
                    Enlace inválido
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {tokenError}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-gray-600">
                      El enlace de restablecimiento puede haber expirado o ya fue utilizado.
                      Solicita un nuevo enlace de recuperación.
                    </p>
                    <Button
                      className="w-full bg-[#1e3a5f] hover:bg-[#152a45]"
                      onClick={() => router.push("/forgot-password")}
                    >
                      Solicitar nuevo enlace
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push("/login")}
                    >
                      <ArrowLeft className="mr-2 size-4" />
                      Volver al inicio de sesión
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : success ? (
              <>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center justify-center size-16 rounded-full bg-green-100">
                      <CheckCircle className="size-8 text-green-600" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-green-600">
                    ¡Contraseña actualizada!
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Tu contraseña ha sido restablecida correctamente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-gray-600">
                      Ya puedes iniciar sesión con tu nueva contraseña.
                    </p>
                    <Button
                      className="w-full bg-[#db0455] hover:bg-[#c20449] text-white font-semibold"
                      onClick={() => router.push("/login")}
                    >
                      Iniciar sesión
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center justify-center size-16 rounded-full bg-[#1e3a5f]">
                      <Key className="size-8 text-[#db0455]" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-[#1e3a5f]">
                    Nueva contraseña
                  </CardTitle>
                  <CardDescription>
                    Hola <strong>{userName}</strong>, ingresa tu nueva contraseña
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Nueva contraseña
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          className="pl-10 pr-10"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                          required
                          minLength={6}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirmar contraseña
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repite la contraseña"
                          className="pl-10 pr-10"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, confirmPassword: e.target.value })
                          }
                          required
                          minLength={6}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#db0455] hover:bg-[#c20449] text-white font-semibold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Restableciendo...
                        </>
                      ) : (
                        "Restablecer contraseña"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push("/login")}
                    >
                      <ArrowLeft className="mr-2 size-4" />
                      Cancelar
                    </Button>
                  </form>
                </CardContent>
              </>
            )}
          </Card>

          {/* Logos en el footer */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <Image
              src="/logos/whitegob.png"
              alt="Gobierno del Perú"
              width={100}
              height={36}
              className="h-8 w-auto opacity-80"
            />
            <Image
              src="/logos/logo_withe_shadow.png"
              alt="UNAMAD"
              width={60}
              height={60}
              className="h-12 w-auto"
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
        <Loader2 className="size-10 animate-spin text-white" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
