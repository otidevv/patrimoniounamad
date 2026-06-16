/**
 * Parser de un solo uso: extrae usuarios del dump MySQL de trámite y genera
 * prisma/data/usuarios-tramite.ts con los datos embebidos.
 *
 * Hace el join users -> empleados -> dependencias para resolver la oficina
 * (dependencia) y el cargo de cada usuario:
 *   users.persona_id -> empleados.persona_id -> empleados.dependencia_id
 *   -> dependencias.abreviatura  (que corresponde al `codigo` en Patrimonio)
 *
 * Uso: node prisma/parse-tramite-users.cjs "C:/ruta/al/tramite_db_xxx.sql"
 */
const fs = require("fs")
const path = require("path")

const SQL_PATH = process.argv[2]
if (!SQL_PATH || !fs.existsSync(SQL_PATH)) {
  console.error("Archivo SQL no encontrado:", SQL_PATH)
  process.exit(1)
}

const content = fs.readFileSync(SQL_PATH, "latin1") // el dump trae bytes utf8; se reinterpreta con fix()

// Tokenizador genérico del INSERT de una tabla -> array de filas (array de valores)
function parseInsert(table) {
  const marker = "INSERT INTO `" + table + "` VALUES "
  const start = content.indexOf(marker)
  if (start === -1) return []
  const lineEnd = content.indexOf("\n", start)
  let stmt = content.slice(start + marker.length, lineEnd === -1 ? undefined : lineEnd).replace(/;\s*$/, "")
  const rows = []
  let i = 0
  const n = stmt.length
  while (i < n) {
    if (stmt[i] !== "(") { i++; continue }
    i++ // saltar '('
    const fields = []
    let cur = ""
    let inStr = false
    let isNull = true
    while (i < n) {
      const c = stmt[i]
      if (inStr) {
        if (c === "\\") {
          const next = stmt[i + 1]
          const map = { n: "\n", r: "\r", t: "\t", 0: "\0", "\\": "\\", "'": "'", '"': '"' }
          cur += map[next] !== undefined ? map[next] : next
          i += 2
          continue
        }
        if (c === "'") {
          if (stmt[i + 1] === "'") { cur += "'"; i += 2; continue }
          inStr = false; i++; continue
        }
        cur += c; i++; continue
      }
      if (c === "'") { inStr = true; isNull = false; i++; continue }
      if (c === "," || c === ")") {
        const token = cur.trim()
        fields.push(isNull && token.toUpperCase() === "NULL" ? null : token)
        cur = ""; isNull = true; i++
        if (c === ")") break
        continue
      }
      cur += c; i++
    }
    rows.push(fields)
  }
  return rows
}

// Reinterpretar latin1 -> utf8 para los textos (el dump original es utf8mb4)
const fix = (v) => (v == null ? null : Buffer.from(v, "latin1").toString("utf8"))

// Alias: abreviatura en trámite -> codigo de dependencia en Patrimonio (seed).
// Solo para casos donde difiere el formato (puntos/espacios vs guiones).
const ALIAS_DEPENDENCIA = {
  "VIV. FOR.": "VIV-FOR",
  "SERV. ALIM.": "SERV-ALIM",
  "ASIST. SOC.": "ASIST-SOC",
  "SER. FARM.": "SER-FARM",
  "SER. TRI.": "SER-TRI",
  "SERV. MED.": "SERV-MED",
  "EP.B": "EP-B",
  "OBRA ENFERMERIA": "OBRA-ENFERMERIA",
}

// --- dependencias: id(0), sede_id(1), dependencia_id(2), abreviatura(3) ---
const depById = {}
for (const r of parseInsert("dependencias")) {
  depById[r[0]] = fix(r[3]) // abreviatura
}

// --- empleados: id(0), dependencia_id(1), persona_id(2), cargo(3), fecha_inicio(4), estado(6) ---
// Por persona, se elige el registro activo (estado=1) y con fecha_inicio más reciente.
const empByPersona = {}
for (const r of parseInsert("empleados")) {
  const persona = r[2]
  const estado = Number(r[6])
  const fi = r[4] || ""
  const score = (estado === 1 ? 1e15 : 0) + (fi ? Date.parse(fi.replace(" ", "T")) || 0 : 0)
  const prev = empByPersona[persona]
  if (!prev || score > prev.score) {
    empByPersona[persona] = { depId: r[1], cargo: fix(r[3]), score }
  }
}

// --- users ---
// id, tipo, codigo, rol_id, persona_id, identidad_documento_id, nro_documento,
// nombre, apaterno, amaterno, email, email_verified_at, password, remember_token,
// estado, created_at, updated_at, correo_personal
const COL = {
  rol_id: 3, persona_id: 4, nro_documento: 6, nombre: 7, apaterno: 8, amaterno: 9,
  email: 10, password: 12, estado: 14, created_at: 15, updated_at: 16,
}

const userRows = parseInsert("users")
console.log("Filas users:", userRows.length, "| dependencias:", Object.keys(depById).length, "| empleados(persona):", Object.keys(empByPersona).length)

let conDependencia = 0
const usuarios = userRows
  .map((r) => {
    const personaId = r[COL.persona_id]
    const emp = personaId ? empByPersona[personaId] : null
    let dependenciaCodigo = null
    if (emp && depById[emp.depId]) {
      const abrev = depById[emp.depId]
      dependenciaCodigo = ALIAS_DEPENDENCIA[abrev] || abrev
    }
    if (dependenciaCodigo) conDependencia++
    return {
      rolOrigenId: r[COL.rol_id] == null ? null : Number(r[COL.rol_id]),
      numeroDocumento: fix(r[COL.nro_documento]),
      nombre: fix(r[COL.nombre]),
      apaterno: fix(r[COL.apaterno]),
      amaterno: fix(r[COL.amaterno]),
      email: fix(r[COL.email]),
      password: r[COL.password], // hash bcrypt, ascii puro
      estado: Number(r[COL.estado]),
      dependenciaCodigo,
      cargo: emp ? emp.cargo : null,
      createdAt: fix(r[COL.created_at]),
      updatedAt: fix(r[COL.updated_at]),
    }
  })
  .filter((u) => u.email && u.password)

console.log("Usuarios válidos:", usuarios.length, "| con dependencia resuelta:", conDependencia)

const outDir = path.join(__dirname, "..", "prisma", "data")
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, "usuarios-tramite.ts")

const header = `// ARCHIVO GENERADO AUTOMÁTICAMENTE - NO EDITAR A MANO
// Fuente: dump MySQL del sistema de trámite (tablas \`users\`, \`empleados\`, \`dependencias\`)
// Regenerar con: node prisma/parse-tramite-users.cjs "<ruta-al-dump>.sql"
// Total de usuarios: ${usuarios.length} | con dependencia: ${conDependencia}

export interface UsuarioTramite {
  rolOrigenId: number | null
  numeroDocumento: string | null
  nombre: string
  apaterno: string
  amaterno: string
  email: string
  password: string
  estado: number
  /** Código de dependencia (= codigo en Patrimonio); null si no se pudo resolver */
  dependenciaCodigo: string | null
  /** Cargo según el registro de empleado activo; null si no hay */
  cargo: string | null
  createdAt: string | null
  updatedAt: string | null
}

export const USUARIOS_TRAMITE: UsuarioTramite[] = ${JSON.stringify(usuarios, null, 2)}
`

fs.writeFileSync(outFile, header, "utf8")
console.log("Generado:", outFile)
