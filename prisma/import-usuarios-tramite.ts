/**
 * Importación masiva de usuarios del sistema de TRÁMITE hacia PATRIMONIO.
 *
 * - Datos embebidos en prisma/data/usuarios-tramite.ts (no depende del .sql en producción).
 * - Las contraseñas se conservan tal cual (hashes bcrypt $2y$): los usuarios
 *   ingresan con su MISMA contraseña del sistema de trámite.
 * - Es idempotente: hace upsert por email, así que se puede re-ejecutar sin duplicar.
 *
 * Requisito previo: los roles base deben existir (ejecutar `npm run db:seed` antes).
 *
 * Ejecutar en producción con:
 *   npm run db:import-usuarios
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import "dotenv/config"
import { USUARIOS_TRAMITE } from "./data/usuarios-tramite"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Mapeo de rol del sistema de origen (rol_id) -> código de rol en Patrimonio.
// Origen: 1=PROGRAMADOR, 3=ADMINISTRADOR, 22=ADMINISTRADOR+PROGRAMADOR  -> ADMIN
//         4=RESP. OFICINA+BOLETA, 12=RESP. OFICINA+CERT,
//         30=RESP. ASUNTOS ACADÉMICOS, 35=RESP. DE HC                    -> RESPONSABLE
//         resto                                                          -> USUARIO
const ADMIN_ORIGEN = new Set([1, 3, 22])
const RESPONSABLE_ORIGEN = new Set([4, 12, 30, 35])

function codigoRolDestino(rolOrigenId: number | null): "ADMIN" | "RESPONSABLE" | "USUARIO" {
  if (rolOrigenId != null && ADMIN_ORIGEN.has(rolOrigenId)) return "ADMIN"
  if (rolOrigenId != null && RESPONSABLE_ORIGEN.has(rolOrigenId)) return "RESPONSABLE"
  return "USUARIO"
}

function parseFecha(s: string | null): Date | undefined {
  if (!s) return undefined
  const d = new Date(s.replace(" ", "T"))
  return isNaN(d.getTime()) ? undefined : d
}

async function main() {
  console.log("========================================")
  console.log(`Importando ${USUARIOS_TRAMITE.length} usuarios de trámite -> patrimonio`)
  console.log("========================================\n")

  // 1. Cargar roles destino (deben existir; los crea el seed)
  const roles = await prisma.rol.findMany({
    where: { codigo: { in: ["ADMIN", "RESPONSABLE", "USUARIO"] } },
    select: { id: true, codigo: true },
  })
  const rolPorCodigo: Record<string, string> = {}
  for (const r of roles) rolPorCodigo[r.codigo] = r.id

  for (const c of ["ADMIN", "RESPONSABLE", "USUARIO"]) {
    if (!rolPorCodigo[c]) {
      console.error(`✗ Falta el rol "${c}". Ejecuta primero: npm run db:seed`)
      process.exit(1)
    }
  }

  // 2. Estado actual de la BD: documentos ya usados (restricción única
  //    [tipoDocumento, numeroDocumento]) y emails existentes (para contar
  //    creados vs. actualizados).
  const existentes = await prisma.usuario.findMany({
    select: { email: true, numeroDocumento: true },
  })
  const docsUsados = new Set<string>(existentes.map((u) => u.numeroDocumento || "").filter(Boolean))
  const emailsExistentes = new Set<string>(existentes.map((u) => u.email.toLowerCase()))

  let creados = 0
  let actualizados = 0
  let docsAnulados = 0
  const porRol: Record<string, number> = { ADMIN: 0, RESPONSABLE: 0, USUARIO: 0 }
  const errores: { email: string; error: string }[] = []

  // 3. Pre-pass secuencial: resolver numeroDocumento evitando colisiones de
  //    unicidad [tipoDocumento, numeroDocumento]. Se hace antes del proceso
  //    en paralelo para que el chequeo de duplicados sea determinista.
  const docResuelto: (string | null)[] = USUARIOS_TRAMITE.map((u) => {
    const doc = (u.numeroDocumento || "").trim() || null
    if (doc && docsUsados.has(doc)) {
      docsAnulados++
      return null
    }
    if (doc) docsUsados.add(doc)
    return doc
  })

  // 4. Procesar en lotes para no saturar el pool de conexiones
  const LOTE = 25
  for (let inicio = 0; inicio < USUARIOS_TRAMITE.length; inicio += LOTE) {
    const lote = USUARIOS_TRAMITE.slice(inicio, inicio + LOTE)
    await Promise.all(
      lote.map(async (u, j) => {
        const email = u.email.trim().toLowerCase()
        const yaExiste = emailsExistentes.has(email)
        const codigoRol = codigoRolDestino(u.rolOrigenId)
        const rolId = rolPorCodigo[codigoRol]
        const numeroDocumento = docResuelto[inicio + j]

        const apellidos = `${u.apaterno || ""} ${u.amaterno || ""}`.trim() || "-"
        const activo = u.estado === 1

        try {
          const res = await prisma.usuario.upsert({
            where: { email },
            update: {
              // No se toca password ni numeroDocumento al re-importar.
              nombre: u.nombre || "-",
              apellidos,
              activo,
              rolId,
            },
            create: {
              email,
              password: u.password, // hash bcrypt original ($2y$)
              nombre: u.nombre || "-",
              apellidos,
              tipoDocumento: "DNI",
              numeroDocumento,
              activo,
              rolId,
              createdAt: parseFecha(u.createdAt),
            },
            select: { id: true },
          })
          void res
          if (yaExiste) actualizados++
          else creados++
          porRol[codigoRol]++
        } catch (e) {
          errores.push({ email, error: e instanceof Error ? e.message : String(e) })
        }
      })
    )
    process.stdout.write(`\r   Procesados: ${Math.min(inicio + LOTE, USUARIOS_TRAMITE.length)}/${USUARIOS_TRAMITE.length}`)
  }

  console.log("\n\n========================================")
  console.log("Importación completada")
  console.log("========================================")
  console.log(`   Creados/actualizados (upsert): ${creados + actualizados}`)
  console.log(`   Documentos anulados por duplicado: ${docsAnulados}`)
  console.log(`   Por rol -> ADMIN: ${porRol.ADMIN}, RESPONSABLE: ${porRol.RESPONSABLE}, USUARIO: ${porRol.USUARIO}`)
  if (errores.length) {
    console.log(`\n   ⚠ ${errores.length} errores:`)
    errores.slice(0, 20).forEach((e) => console.log(`     - ${e.email}: ${e.error}`))
  }
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
