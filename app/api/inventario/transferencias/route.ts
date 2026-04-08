import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Listar transferencias (enviadas o recibidas por el usuario actual)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo") // "enviadas" | "recibidas" | "bien"
    const verificacionId = searchParams.get("verificacionId")

    const where: Record<string, unknown> = {}

    if (tipo === "enviadas") {
      where.remitenteId = session.id
    } else if (tipo === "recibidas") {
      where.destinatarioId = session.id
    } else if (tipo === "bien" && verificacionId) {
      // Historial de un bien específico
      where.verificacionId = verificacionId
    }

    const transferencias = await prisma.transferenciaBien.findMany({
      where,
      include: {
        remitente: { select: { id: true, nombre: true, apellidos: true } },
        destinatario: { select: { id: true, nombre: true, apellidos: true } },
        verificacion: {
          select: {
            id: true,
            codigoPatrimonial: true,
            descripcionSiga: true,
            marcaSiga: true,
            modeloSiga: true,
          },
        },
      },
      orderBy: { fechaSolicitud: "desc" },
    })

    return NextResponse.json({ transferencias })
  } catch (error) {
    console.error("Error al listar transferencias:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST: Crear solicitud de transferencia
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const {
      verificacionId,
      dniDestinatario,
      nombreDestinatario,
      destinatarioId,
      motivo,
    } = body

    if (!verificacionId || !dniDestinatario || !nombreDestinatario) {
      return NextResponse.json(
        { error: "Datos incompletos: se requiere verificación, DNI y nombre del destinatario" },
        { status: 400 }
      )
    }

    // Obtener la verificación
    const verificacion = await prisma.verificacionBien.findUnique({
      where: { id: verificacionId },
      select: {
        id: true,
        codigoPatrimonial: true,
        descripcionSiga: true,
        dniResponsableActual: true,
        nombresResponsableActual: true,
        apellidosResponsableActual: true,
        asignacion: { select: { estado: true } },
      },
    })

    if (!verificacion) {
      return NextResponse.json({ error: "Bien no encontrado" }, { status: 404 })
    }

    // Verificar que la asignación esté aceptada/cerrada (el bien está confirmado)
    if (verificacion.asignacion && verificacion.asignacion.estado === "PENDIENTE") {
      return NextResponse.json(
        { error: "No se puede transferir un bien cuya asignación aún no fue aceptada" },
        { status: 400 }
      )
    }

    // Verificar que no haya una transferencia pendiente para este bien
    const pendiente = await prisma.transferenciaBien.findFirst({
      where: {
        verificacionId,
        estado: "PENDIENTE",
      },
    })

    if (pendiente) {
      return NextResponse.json(
        { error: "Ya existe una transferencia pendiente para este bien" },
        { status: 409 }
      )
    }

    // No transferir a uno mismo
    if (verificacion.dniResponsableActual === dniDestinatario) {
      return NextResponse.json(
        { error: "No se puede transferir un bien a la misma persona que lo tiene" },
        { status: 400 }
      )
    }

    const nombreRemitente = [verificacion.nombresResponsableActual, verificacion.apellidosResponsableActual]
      .filter(Boolean).join(" ") || "Desconocido"

    const transferencia = await prisma.transferenciaBien.create({
      data: {
        verificacionId,
        codigoPatrimonial: verificacion.codigoPatrimonial,
        descripcionBien: verificacion.descripcionSiga,
        remitenteId: session.id,
        dniRemitente: verificacion.dniResponsableActual || "",
        nombreRemitente,
        destinatarioId: destinatarioId || null,
        dniDestinatario,
        nombreDestinatario,
        motivo: motivo || null,
      },
      include: {
        remitente: { select: { id: true, nombre: true, apellidos: true } },
        destinatario: { select: { id: true, nombre: true, apellidos: true } },
      },
    })

    return NextResponse.json({ transferencia }, { status: 201 })
  } catch (error) {
    console.error("Error al crear transferencia:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
