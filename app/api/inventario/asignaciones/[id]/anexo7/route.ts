import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generarAnexo7PDF, FilaAnexo7 } from "@/lib/generar-anexo7"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

// POST: Generar (o regenerar) el PDF del Anexo 7 de una asignación.
// Regenerar invalida las firmas digitales previas.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const asignacion = await prisma.asignacionInventario.findUnique({
      where: { id },
      include: {
        sesion: {
          include: {
            dependencia: { select: { nombre: true } },
            participantes: {
              where: { activo: true },
              include: {
                usuario: { select: { nombre: true, apellidos: true } },
              },
            },
          },
        },
        verificaciones: {
          orderBy: { fechaVerificacion: "asc" },
        },
      },
    })

    if (!asignacion) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      )
    }

    // Solo el equipo inventariador (o admin) puede generar/regenerar el Anexo 7:
    // regenerarlo invalida las firmas digitales existentes
    const esAdmin = session.rol === "ADMIN"
    const esResponsable = asignacion.sesion.responsableId === session.id
    const esParticipante = asignacion.sesion.participantes.some(
      (p) => p.usuarioId === session.id
    )
    if (!esAdmin && !esResponsable && !esParticipante) {
      return NextResponse.json(
        { error: "No tiene permiso para generar el Anexo 7 de esta sesión" },
        { status: 403 }
      )
    }

    if (asignacion.verificaciones.length === 0) {
      return NextResponse.json(
        { error: "La asignación no tiene bienes verificados" },
        { status: 400 }
      )
    }

    const sesion = asignacion.sesion
    const primera = asignacion.verificaciones[0]

    const nombreUsuario = [
      asignacion.nombres,
      asignacion.apellidoPaterno,
      asignacion.apellidoMaterno,
    ]
      .filter(Boolean)
      .join(" ")

    const mapEstado: Record<string, string> = {
      BUENO: "BUENO",
      REGULAR: "REGULAR",
      MALO: "MALO",
      INOPERATIVO: "MALO",
      CHATARRA: "CHATARRA",
    }

    const filas: FilaAnexo7[] = asignacion.verificaciones.map((v) => {
      let situacion = v.situacion || ""
      if (!situacion) {
        if (v.resultado === "ENCONTRADO" || v.resultado === "REUBICADO") {
          situacion = "U"
        } else if (v.resultado === "NO_ENCONTRADO") {
          situacion = "F"
        } else if (v.resultado === "SOBRANTE") {
          situacion = "S"
        }
      }

      return {
        codigo: v.codigoPatrimonial,
        denominacion: v.descripcionSiga || "",
        marca: v.marcaSiga || "SIN MARCA",
        modelo: v.modeloSiga || "",
        tipo: "Sin tipo",
        color: v.colorSiga || "Sin color",
        serie: v.serieSiga || "SIN SERIE",
        dimensiones: v.dimensionesSiga || "Sin medidas",
        otros: v.otrosSiga || "No indica",
        situacion,
        estadoConservacion: v.estadoFisico
          ? mapEstado[v.estadoFisico] || v.estadoFisico
          : "",
        observacion: v.observaciones || "",
      }
    })

    const anio = sesion.fechaProgramada
      ? new Date(sesion.fechaProgramada).getFullYear()
      : new Date().getFullYear()

    const pdfBuffer = await generarAnexo7PDF({
      anio,
      nombreUsuario: nombreUsuario.toUpperCase(),
      nombreDependencia:
        sesion.sigaNombreDependencia ||
        sesion.dependencia?.nombre ||
        primera.dependenciaSiga ||
        "",
      ubicacionFisica: primera.ubicacionSiga || sesion.ubicacionFisica || "",
      inventariadores: sesion.participantes.map((p) =>
        `${p.usuario.apellidos} ${p.usuario.nombre}`.toUpperCase()
      ),
      equipoTrabajo: sesion.participantes.length || 1,
      filas,
    })

    // Guardar PDF en disco
    const sanitize = (str: string) => str.replace(/[\/\\:*?"<>|\s]+/g, "_")
    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      "inventario",
      "anexo7",
      String(anio),
      sanitize(sesion.codigo)
    )
    await mkdir(uploadDir, { recursive: true })

    const fileName = `Anexo7_${sanitize(nombreUsuario)}_${sanitize(asignacion.numeroDocumento)}.pdf`
    await writeFile(path.join(uploadDir, fileName), pdfBuffer)

    const relativePath = `/api/uploads/inventario/anexo7/${anio}/${sanitize(sesion.codigo)}/${fileName}`

    // Registrar en la asignación; regenerar invalida firmas previas
    const actualizada = await prisma.asignacionInventario.update({
      where: { id },
      data: {
        anexo7Url: relativePath,
        anexo7GeneradoAt: new Date(),
        anexo7FirmaInventariadorAt: null,
        anexo7FirmaUsuarioAt: null,
      },
    })

    return NextResponse.json({ asignacion: actualizada })
  } catch (error) {
    console.error("Error al generar Anexo 7 PDF:", error)
    return NextResponse.json(
      { error: "Error al generar el Anexo 7 en PDF" },
      { status: 500 }
    )
  }
}
