"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar la solicitud")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud")
    } finally {
      setIsLoading(false)
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
            src="/banners/4.jpg"
            alt="UNAMAD Campus"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/80 via-[#1e3a5f]/70 to-[#1e3a5f]/80" />
        </div>

        <div className="relative w-full max-w-md">
          <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95 text-gray-900">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center size-16 rounded-full bg-[#1e3a5f]">
                  <Mail className="size-8 text-[#db0455]" />
                </div>
              </div>
              <CardTitle className="text-2xl text-[#1e3a5f]">
                ¿Olvidaste tu contraseña?
              </CardTitle>
              <CardDescription>
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="flex items-center justify-center size-16 rounded-full bg-green-100">
                      <CheckCircle className="size-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-[#1e3a5f]">
                    ¡Correo enviado!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Si el correo <strong>{email}</strong> está registrado en nuestro sistema,
                    recibirás un enlace para restablecer tu contraseña.
                  </p>
                  <p className="text-xs text-gray-500">
                    Revisa también tu carpeta de spam.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => router.push("/login")}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Volver al inicio de sesión
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@unamad.edu.pe"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
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
                        Enviando...
                      </>
                    ) : (
                      "Enviar enlace de recuperación"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/login")}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Volver al inicio de sesión
                  </Button>
                </form>
              )}
            </CardContent>
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
