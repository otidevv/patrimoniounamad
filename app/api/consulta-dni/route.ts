import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string
}

async function verifyAuth(): Promise<UserPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    return decoded
  } catch {
    return null
  }
}

interface DatosReniec {
  id: number
  DNI: string
  AP_PAT: string
  AP_MAT: string
  NOMBRES: string
  FECHA_NAC: string
  SEXO: string
  EST_CIVIL: string
  DIRECCION: string
  UBIGEO_DIR: string
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dni = searchParams.get("dni")

    if (!dni) {
      return NextResponse.json({ error: "DNI es requerido" }, { status: 400 })
    }

    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      return NextResponse.json(
        { error: "El DNI debe tener 8 dígitos" },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://apidatos.unamad.edu.pe/api/consulta/${dni}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se encontró información para el DNI proporcionado" },
        { status: 404 }
      )
    }

    const data: DatosReniec = await response.json()

    // Formatear los datos para nuestro formulario
    return NextResponse.json({
      encontrado: true,
      datos: {
        nombre: formatearNombre(data.NOMBRES),
        apellidos: `${formatearNombre(data.AP_PAT)} ${formatearNombre(data.AP_MAT)}`,
        numeroDocumento: data.DNI,
      },
    })
  } catch (error) {
    console.error("Error al consultar DNI:", error)
    return NextResponse.json(
      { error: "Error al consultar el servicio" },
      { status: 500 }
    )
  }
}

// Función para formatear nombres (capitalizar correctamente)
function formatearNombre(texto: string): string {
  if (!texto) return ""
  return texto
    .toLowerCase()
    .split(" ")
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ")
}
