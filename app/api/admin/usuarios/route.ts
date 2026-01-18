import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { TipoDocumento } from "@prisma/client"

const JWT_SECRET = process.env.JWT_SECRET || "unamad-patrimonio-secret"

interface UserPayload {
  id: string
  rol: string      // Código del rol (ej: "ADMIN")
  rolId: string    // ID del rol
}

interface PermisosModulo {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

async function verifyUserWithPermission(accion: keyof PermisosModulo = "ver"): Promise<{ user: UserPayload; permisos: PermisosModulo } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload
    let rolId = decoded.rolId

    // Admin siempre tiene todos los permisos
    if (decoded.rol === "ADMIN") {
      return {
        user: decoded,
        permisos: { ver: true, crear: true, editar: true, eliminar: true, reportes: true }
      }
    }

    // Si no hay rolId en el token (tokens antiguos), buscar por código
    if (!rolId) {
      const rol = await prisma.rol.findUnique({
        where: { codigo: decoded.rol }
      })
      if (rol) {
        rolId = rol.id
      }
    }

    if (!rolId) return null

    // Obtener permisos del módulo USUARIOS para este rol
    const permiso = await prisma.permisoRol.findFirst({
      where: {
        rolId,
        modulo: "USUARIOS"
      }
    })

    if (!permiso || !permiso[accion]) {
      return null
    }

    return {
      user: decoded,
      permisos: {
        ver: permiso.ver,
        crear: permiso.crear,
        editar: permiso.editar,
        eliminar: permiso.eliminar,
        reportes: permiso.reportes
      }
    }
  } catch {
    return null
  }
}

// GET - Listar usuarios
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUserWithPermission("ver")
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const rolId = searchParams.get("rolId") || ""
    const activo = searchParams.get("activo")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { apellidos: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { numeroDocumento: { contains: search, mode: "insensitive" } },
      ]
    }

    if (rolId) {
      where.rolId = rolId
    }

    if (activo !== null && activo !== "") {
      where.activo = activo === "true"
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: {
          id: true,
          email: true,
          nombre: true,
          apellidos: true,
          tipoDocumento: true,
          numeroDocumento: true,
          cargo: true,
          telefono: true,
          foto: true,
          fechaInicio: true,
          fechaFin: true,
          activo: true,
          rolId: true,
          rol: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              color: true,
            }
          },
          sedeId: true,
          sede: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
          dependenciaId: true,
          dependencia: {
            select: {
              id: true,
              nombre: true,
              siglas: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.usuario.count({ where }),
    ])

    return NextResponse.json({
      usuarios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error al listar usuarios:", error)
    return NextResponse.json(
      { error: "Error al listar usuarios" },
      { status: 500 }
    )
  }
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUserWithPermission("crear")
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, nombre, apellidos, tipoDocumento, numeroDocumento, cargo, telefono, fechaInicio, fechaFin, rolId, sedeId, dependenciaId } = body

    // Validaciones
    if (!email || !password || !nombre || !apellidos) {
      return NextResponse.json(
        { error: "Email, contraseña, nombre y apellidos son requeridos" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Verificar que el rol existe
    let finalRolId = rolId
    if (!finalRolId) {
      // Si no se proporciona rolId, buscar el rol USUARIO por defecto
      const rolUsuario = await prisma.rol.findUnique({
        where: { codigo: "USUARIO" }
      })
      if (rolUsuario) {
        finalRolId = rolUsuario.id
      } else {
        return NextResponse.json(
          { error: "Rol por defecto no encontrado" },
          { status: 400 }
        )
      }
    } else {
      // Verificar que el rol existe
      const rol = await prisma.rol.findUnique({
        where: { id: finalRolId }
      })
      if (!rol) {
        return NextResponse.json(
          { error: "Rol no encontrado" },
          { status: 400 }
        )
      }
    }

    // Verificar email único
    const existingEmail = await prisma.usuario.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      )
    }

    // Verificar documento único si se proporciona
    if (numeroDocumento) {
      const existingDoc = await prisma.usuario.findFirst({
        where: {
          tipoDocumento: (tipoDocumento as TipoDocumento) || "DNI",
          numeroDocumento,
        },
      })

      if (existingDoc) {
        return NextResponse.json(
          { error: "El número de documento ya está registrado" },
          { status: 400 }
        )
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const usuario = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        apellidos,
        tipoDocumento: (tipoDocumento as TipoDocumento) || "DNI",
        numeroDocumento: numeroDocumento || null,
        cargo: cargo || null,
        telefono: telefono || null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        rolId: finalRolId,
        sedeId: sedeId || null,
        dependenciaId: dependenciaId || null,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        tipoDocumento: true,
        numeroDocumento: true,
        cargo: true,
        telefono: true,
        foto: true,
        fechaInicio: true,
        fechaFin: true,
        activo: true,
        rolId: true,
        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            color: true,
          }
        },
        sedeId: true,
        sede: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        dependenciaId: true,
        dependencia: {
          select: {
            id: true,
            nombre: true,
            siglas: true,
          },
        },
        createdAt: true,
      },
    })

    return NextResponse.json({
      message: "Usuario creado correctamente",
      usuario,
    })
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar usuario
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyUserWithPermission("editar")
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { id, email, nombre, apellidos, tipoDocumento, numeroDocumento, cargo, telefono, fechaInicio, fechaFin, rolId, sedeId, dependenciaId, activo } = body

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 })
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.usuario.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Verificar que el rol existe si se proporciona
    if (rolId) {
      const rol = await prisma.rol.findUnique({
        where: { id: rolId }
      })
      if (!rol) {
        return NextResponse.json(
          { error: "Rol no encontrado" },
          { status: 400 }
        )
      }
    }

    // Verificar email único si cambió
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.usuario.findUnique({
        where: { email },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: "El email ya está registrado por otro usuario" },
          { status: 400 }
        )
      }
    }

    // Verificar documento único si cambió
    const newTipoDoc = tipoDocumento || existingUser.tipoDocumento
    const newNumeroDoc = numeroDocumento !== undefined ? numeroDocumento : existingUser.numeroDocumento

    if (newNumeroDoc && (newTipoDoc !== existingUser.tipoDocumento || newNumeroDoc !== existingUser.numeroDocumento)) {
      const docExists = await prisma.usuario.findFirst({
        where: {
          tipoDocumento: newTipoDoc as TipoDocumento,
          numeroDocumento: newNumeroDoc,
          NOT: { id },
        },
      })

      if (docExists) {
        return NextResponse.json(
          { error: "El documento ya está registrado por otro usuario" },
          { status: 400 }
        )
      }
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        email: email || existingUser.email,
        nombre: nombre || existingUser.nombre,
        apellidos: apellidos || existingUser.apellidos,
        tipoDocumento: tipoDocumento ? (tipoDocumento as TipoDocumento) : existingUser.tipoDocumento,
        numeroDocumento: numeroDocumento !== undefined ? (numeroDocumento || null) : existingUser.numeroDocumento,
        cargo: cargo !== undefined ? (cargo || null) : existingUser.cargo,
        telefono: telefono !== undefined ? (telefono || null) : existingUser.telefono,
        fechaInicio: fechaInicio !== undefined ? (fechaInicio ? new Date(fechaInicio) : null) : existingUser.fechaInicio,
        fechaFin: fechaFin !== undefined ? (fechaFin ? new Date(fechaFin) : null) : existingUser.fechaFin,
        rolId: rolId || existingUser.rolId,
        sedeId: sedeId !== undefined ? (sedeId || null) : existingUser.sedeId,
        dependenciaId: dependenciaId !== undefined ? (dependenciaId || null) : existingUser.dependenciaId,
        activo: activo !== undefined ? activo : existingUser.activo,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        tipoDocumento: true,
        numeroDocumento: true,
        cargo: true,
        telefono: true,
        foto: true,
        fechaInicio: true,
        fechaFin: true,
        activo: true,
        rolId: true,
        rol: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            color: true,
          }
        },
        sedeId: true,
        sede: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        dependenciaId: true,
        dependencia: {
          select: {
            id: true,
            nombre: true,
            siglas: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      message: "Usuario actualizado correctamente",
      usuario,
    })
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar usuario (soft delete - desactivar)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyUserWithPermission("eliminar")
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 })
    }

    // No permitir que un usuario se elimine a sí mismo
    if (id === auth.user.id) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      )
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json({
      message: "Usuario desactivado correctamente",
      usuario: { id: usuario.id },
    })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}
