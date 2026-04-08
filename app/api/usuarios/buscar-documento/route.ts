import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Buscar usuario del sistema por número de documento
// Si no se encuentra en el sistema, intenta la API externa de RENIEC
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documento = searchParams.get("documento")
    const tipo = searchParams.get("tipo") || "DNI"

    if (!documento) {
      return NextResponse.json({ error: "Número de documento es requerido" }, { status: 400 })
    }

    // 1. Buscar en usuarios del sistema
    const usuario = await prisma.usuario.findFirst({
      where: {
        numeroDocumento: documento,
        ...(tipo === "DNI" ? { tipoDocumento: "DNI" } : {}),
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        tipoDocumento: true,
        numeroDocumento: true,
        cargo: true,
        email: true,
        dependencia: { select: { id: true, nombre: true, siglas: true } },
        sede: { select: { id: true, nombre: true } },
        activo: true,
      },
    })

    if (usuario) {
      // Separar apellidos en paterno y materno
      const partes = usuario.apellidos.split(" ")
      const apellidoPaterno = partes[0] || ""
      const apellidoMaterno = partes.slice(1).join(" ") || ""

      return NextResponse.json({
        encontrado: true,
        origen: "sistema",
        datos: {
          usuarioId: usuario.id,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          apellidoPaterno,
          apellidoMaterno,
          tipoDocumento: usuario.tipoDocumento,
          numeroDocumento: usuario.numeroDocumento,
          cargo: usuario.cargo,
          email: usuario.email,
          dependencia: usuario.dependencia,
          sede: usuario.sede,
          activo: usuario.activo,
        },
      })
    }

    // 2. Si es DNI de 8 dígitos, intentar API externa RENIEC
    if (tipo === "DNI" && documento.length === 8 && /^\d+$/.test(documento)) {
      try {
        const response = await fetch(
          `https://apidatos.unamad.edu.pe/api/consulta/${documento}`,
          { headers: { Accept: "application/json" } }
        )

        if (response.ok) {
          const data = await response.json()

          const formatNombre = (t: string) =>
            t ? t.toLowerCase().split(" ").map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") : ""

          return NextResponse.json({
            encontrado: true,
            origen: "reniec",
            datos: {
              usuarioId: null,
              nombre: formatNombre(data.NOMBRES),
              apellidos: `${formatNombre(data.AP_PAT)} ${formatNombre(data.AP_MAT)}`,
              apellidoPaterno: formatNombre(data.AP_PAT),
              apellidoMaterno: formatNombre(data.AP_MAT),
              tipoDocumento: "DNI",
              numeroDocumento: data.DNI,
              cargo: null,
              email: null,
              dependencia: null,
              sede: null,
              activo: null,
            },
          })
        }
      } catch (err) {
        console.error("Error consultando API RENIEC:", err)
      }
    }

    // 3. No encontrado en ningún lado
    return NextResponse.json({
      encontrado: false,
      origen: null,
      datos: null,
    })
  } catch (error) {
    console.error("Error al buscar usuario por documento:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
