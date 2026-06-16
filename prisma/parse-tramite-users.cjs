/**
 * Parser de un solo uso: extrae la tabla `users` del dump MySQL de tramite
 * y genera prisma/data/usuarios-tramite.ts con los datos embebidos.
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

// Columnas de la tabla `users` (en orden del dump)
// id, tipo, codigo, rol_id, persona_id, identidad_documento_id, nro_documento,
// nombre, apaterno, amaterno, email, email_verified_at, password, remember_token,
// estado, created_at, updated_at, correo_personal
const COL = {
  rol_id: 3,
  nro_documento: 6,
  nombre: 7,
  apaterno: 8,
  amaterno: 9,
  email: 10,
  password: 12,
  estado: 14,
  created_at: 15,
  updated_at: 16,
}

const content = fs.readFileSync(SQL_PATH, "latin1") // el dump trae bytes utf8 dentro; lo reinterpretamos abajo
// Localizar la línea del INSERT de `users`
const marker = "INSERT INTO `users` VALUES "
const start = content.indexOf(marker)
if (start === -1) {
  console.error("No se encontró el INSERT de `users`")
  process.exit(1)
}
// La sentencia termina en el primer ";\n" o ");" de fin de línea
const lineEnd = content.indexOf("\n", start)
let stmt = content.slice(start + marker.length, lineEnd === -1 ? undefined : lineEnd)
stmt = stmt.replace(/;\s*$/, "")

// Tokenizador: recorre los tuples (...),(...),...
const rows = []
let i = 0
const n = stmt.length
while (i < n) {
  if (stmt[i] !== "(") {
    i++
    continue
  }
  i++ // saltar '('
  const fields = []
  let cur = ""
  let inStr = false
  let isNull = true // si nunca abrimos comilla y el token es "NULL"
  while (i < n) {
    const c = stmt[i]
    if (inStr) {
      if (c === "\\") {
        // escape de MySQL
        const next = stmt[i + 1]
        const map = { n: "\n", r: "\r", t: "\t", 0: "\0", "\\": "\\", "'": "'", '"': '"' }
        cur += map[next] !== undefined ? map[next] : next
        i += 2
        continue
      }
      if (c === "'") {
        // posible '' escapado
        if (stmt[i + 1] === "'") {
          cur += "'"
          i += 2
          continue
        }
        inStr = false
        i++
        continue
      }
      cur += c
      i++
      continue
    }
    // fuera de string
    if (c === "'") {
      inStr = true
      isNull = false
      i++
      continue
    }
    if (c === "," || c === ")") {
      const token = cur.trim()
      fields.push(isNull && token.toUpperCase() === "NULL" ? null : token)
      cur = ""
      isNull = true
      i++
      if (c === ")") break
      continue
    }
    cur += c
    i++
  }
  rows.push(fields)
}

console.log("Filas parseadas:", rows.length)

// Reinterpretar latin1 -> utf8 para los textos (el dump original es utf8mb4)
const fix = (v) => (v == null ? null : Buffer.from(v, "latin1").toString("utf8"))

const usuarios = rows
  .map((r) => ({
    rolOrigenId: r[COL.rol_id] == null ? null : Number(r[COL.rol_id]),
    numeroDocumento: fix(r[COL.nro_documento]),
    nombre: fix(r[COL.nombre]),
    apaterno: fix(r[COL.apaterno]),
    amaterno: fix(r[COL.amaterno]),
    email: fix(r[COL.email]),
    password: r[COL.password], // hash bcrypt, ascii puro
    estado: Number(r[COL.estado]),
    createdAt: fix(r[COL.created_at]),
    updatedAt: fix(r[COL.updated_at]),
  }))
  .filter((u) => u.email && u.password)

console.log("Usuarios válidos (con email y password):", usuarios.length)

const outDir = path.join(__dirname, "..", "prisma", "data")
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, "usuarios-tramite.ts")

const header = `// ARCHIVO GENERADO AUTOMÁTICAMENTE - NO EDITAR A MANO
// Fuente: dump MySQL del sistema de trámite (tabla \`users\`)
// Regenerar con: node prisma/parse-tramite-users.cjs "<ruta-al-dump>.sql"
// Total de usuarios: ${usuarios.length}

export interface UsuarioTramite {
  rolOrigenId: number | null
  numeroDocumento: string | null
  nombre: string
  apaterno: string
  amaterno: string
  email: string
  password: string
  estado: number
  createdAt: string | null
  updatedAt: string | null
}

export const USUARIOS_TRAMITE: UsuarioTramite[] = ${JSON.stringify(usuarios, null, 2)}
`

fs.writeFileSync(outFile, header, "utf8")
console.log("Generado:", outFile)
