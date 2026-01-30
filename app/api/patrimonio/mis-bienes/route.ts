import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { buscarBienesPorDocumento, verificarConexion } from "@/lib/siga"

// GET: Obtener bienes asignados al usuario actual
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // Verificar que el usuario tenga número de documento
    if (!user.numeroDocumento) {
      return NextResponse.json(
        { error: "Tu perfil no tiene un número de documento registrado. Contacta al administrador." },
        { status: 400 }
      )
    }

    // Verificar conexión con SIGA
    const conexionOk = await verificarConexion()
    if (!conexionOk) {
      return NextResponse.json(
        { error: "No se pudo conectar al servidor SIGA" },
        { status: 503 }
      )
    }

    // Buscar bienes por el DNI del usuario
    const bienes = await buscarBienesPorDocumento(user.numeroDocumento, 500)

    return NextResponse.json({
      bienes,
      total: bienes.length,
      usuario: {
        nombre: `${user.nombre} ${user.apellidos}`,
        documento: user.numeroDocumento,
      },
    })
  } catch (error) {
    console.error("Error al obtener mis bienes:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
