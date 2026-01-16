import { PrismaClient, Modulo } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Definición de roles iniciales del sistema
const ROLES_INICIALES = [
  {
    codigo: "ADMIN",
    nombre: "Administrador",
    descripcion: "Acceso total al sistema",
    color: "#ef4444",
    esSistema: true
  },
  {
    codigo: "JEFE_PATRIMONIO",
    nombre: "Jefe de Patrimonio",
    descripcion: "Gestión completa de patrimonio",
    color: "#3b82f6",
    esSistema: true
  },
  {
    codigo: "RESPONSABLE",
    nombre: "Responsable",
    descripcion: "Responsable de bienes asignados",
    color: "#22c55e",
    esSistema: true
  },
  {
    codigo: "USUARIO",
    nombre: "Usuario",
    descripcion: "Usuario básico del sistema",
    color: "#6b7280",
    esSistema: true
  },
]

async function main() {
  console.log("Iniciando seed...")

  // 1. Crear roles del sistema
  console.log("\n1. Creando roles del sistema...")
  const rolesCreados: Record<string, string> = {}

  for (const rolData of ROLES_INICIALES) {
    const rol = await prisma.rol.upsert({
      where: { codigo: rolData.codigo },
      update: {
        nombre: rolData.nombre,
        descripcion: rolData.descripcion,
        color: rolData.color,
        esSistema: rolData.esSistema,
      },
      create: rolData,
    })
    rolesCreados[rol.codigo] = rol.id
    console.log(`   Rol creado: ${rol.nombre} (${rol.codigo})`)
  }

  // 2. Crear dependencia de prueba
  console.log("\n2. Creando dependencias...")
  const dependencia = await prisma.dependencia.upsert({
    where: { codigo: "001" },
    update: {},
    create: {
      codigo: "001",
      nombre: "Oficina de Control Patrimonial",
      siglas: "OCP",
      tipo: "OFICINA",
    },
  })
  console.log(`   Dependencia creada: ${dependencia.nombre}`)

  // Crear algunas dependencias adicionales
  const dependencias = [
    { codigo: "002", nombre: "Rectorado", siglas: "RECT", tipo: "RECTORADO" as const },
    { codigo: "003", nombre: "Vicerrectorado Académico", siglas: "VRAC", tipo: "VICERRECTORADO" as const },
    { codigo: "004", nombre: "Facultad de Ingeniería", siglas: "FI", tipo: "FACULTAD" as const },
    { codigo: "005", nombre: "Facultad de Educación", siglas: "FE", tipo: "FACULTAD" as const },
    { codigo: "006", nombre: "Biblioteca Central", siglas: "BC", tipo: "OFICINA" as const },
  ]

  for (const dep of dependencias) {
    await prisma.dependencia.upsert({
      where: { codigo: dep.codigo },
      update: {},
      create: dep,
    })
  }
  console.log("   Dependencias adicionales creadas")

  // 3. Crear usuarios de prueba
  console.log("\n3. Creando usuarios de prueba...")
  const passwordHash = await bcrypt.hash("admin123", 10)

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@unamad.edu.pe" },
    update: { rolId: rolesCreados["ADMIN"] },
    create: {
      email: "admin@unamad.edu.pe",
      password: passwordHash,
      nombre: "Administrador",
      apellidos: "Sistema",
      tipoDocumento: "DNI",
      numeroDocumento: "00000000",
      cargo: "Administrador del Sistema",
      rolId: rolesCreados["ADMIN"],
      dependenciaId: dependencia.id,
    },
  })
  console.log(`   Usuario admin creado: ${admin.email}`)

  const userPasswordHash = await bcrypt.hash("usuario123", 10)
  const usuario = await prisma.usuario.upsert({
    where: { email: "usuario@unamad.edu.pe" },
    update: { rolId: rolesCreados["RESPONSABLE"] },
    create: {
      email: "usuario@unamad.edu.pe",
      password: userPasswordHash,
      nombre: "Juan",
      apellidos: "Pérez García",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      cargo: "Responsable de Patrimonio",
      rolId: rolesCreados["RESPONSABLE"],
      dependenciaId: dependencia.id,
    },
  })
  console.log(`   Usuario de prueba creado: ${usuario.email}`)

  // 4. Crear grupos de bienes
  console.log("\n4. Creando grupos de bienes...")
  const grupos = [
    { codigo: "7408", nombre: "EQUIPOS DE COMPUTO" },
    { codigo: "7409", nombre: "MOBILIARIO" },
    { codigo: "7410", nombre: "VEHICULOS" },
    { codigo: "7411", nombre: "MAQUINARIA" },
  ]

  for (const grupo of grupos) {
    await prisma.grupoBien.upsert({
      where: { codigo: grupo.codigo },
      update: {},
      create: grupo,
    })
  }
  console.log("   Grupos de bienes creados")

  // 5. Crear permisos por defecto para cada rol
  console.log("\n5. Creando permisos por defecto...")
  const modulos = Object.values(Modulo)
  const modulosAdmin = ["USUARIOS", "CONFIGURACION", "ROLES_PERMISOS", "ADMIN_PANEL"]
  const modulosRestringidosJefe = ["USUARIOS", "CONFIGURACION", "ROLES_PERMISOS"]

  for (const [codigoRol, rolId] of Object.entries(rolesCreados)) {
    // Eliminar permisos existentes del rol
    await prisma.permisoRol.deleteMany({ where: { rolId } })

    // Crear permisos según el rol
    for (const modulo of modulos) {
      let permisoData = {
        rolId,
        modulo,
        ver: false,
        crear: false,
        editar: false,
        eliminar: false,
        reportes: false,
      }

      switch (codigoRol) {
        case "ADMIN":
          permisoData = { ...permisoData, ver: true, crear: true, editar: true, eliminar: true, reportes: true }
          break
        case "JEFE_PATRIMONIO":
          permisoData = {
            ...permisoData,
            ver: !modulosRestringidosJefe.includes(modulo),
            crear: !modulosRestringidosJefe.includes(modulo) && modulo !== "ADMIN_PANEL",
            editar: !modulosRestringidosJefe.includes(modulo) && modulo !== "ADMIN_PANEL",
            eliminar: !modulosRestringidosJefe.includes(modulo) && modulo !== "ADMIN_PANEL",
            reportes: !modulosRestringidosJefe.includes(modulo),
          }
          break
        case "RESPONSABLE":
          permisoData = {
            ...permisoData,
            ver: !modulosAdmin.includes(modulo),
            crear: ["BIENES", "INVENTARIO"].includes(modulo),
            editar: ["BIENES", "INVENTARIO"].includes(modulo),
            eliminar: false,
            reportes: ["BIENES", "INVENTARIO", "REPORTES"].includes(modulo),
          }
          break
        case "USUARIO":
          permisoData = {
            ...permisoData,
            ver: ["DASHBOARD", "BIENES", "INVENTARIO"].includes(modulo),
            crear: false,
            editar: false,
            eliminar: false,
            reportes: false,
          }
          break
      }

      await prisma.permisoRol.create({ data: permisoData })
    }
    console.log(`   Permisos creados para rol: ${codigoRol}`)
  }

  console.log("\n========================================")
  console.log("Seed completado exitosamente!")
  console.log("========================================")
  console.log("\nCredenciales de prueba:")
  console.log("  Admin: admin@unamad.edu.pe / admin123")
  console.log("  Usuario: usuario@unamad.edu.pe / usuario123")
  console.log("========================================")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
