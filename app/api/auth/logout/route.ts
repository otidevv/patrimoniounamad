import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    // Borrar JWT propio
    cookieStore.delete("auth-token")
    // Borrar cookies de NextAuth (desarrollo: sin prefijo, producción: con prefijo __Secure-)
    cookieStore.delete("next-auth.session-token")
    cookieStore.delete("next-auth.csrf-token")
    cookieStore.delete("next-auth.callback-url")
    cookieStore.delete("__Secure-next-auth.session-token")
    cookieStore.delete("__Secure-next-auth.csrf-token")
    cookieStore.delete("__Secure-next-auth.callback-url")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en logout:", error)
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 }
    )
  }
}
