/**
 * Funciones puras y reutilizables del sistema de patrimonio.
 *
 * Se extraen aquí para poder probarlas de forma aislada (Jest) sin depender
 * de la base de datos, SIGA, ni de APIs del navegador.
 */

// ---------------------------------------------------------------------------
// 1) VALIDACIÓN DE DATOS DE UN BIEN
// ---------------------------------------------------------------------------

export interface BienInput {
  codigoPatrimonial?: string | null
  descripcion?: string | null
  valorCompra?: number | null
}

export interface ResultadoValidacion {
  valido: boolean
  errores: string[]
}

/**
 * Valida el formato del código patrimonial del SIGA.
 * Regla: exactamente 12 dígitos numéricos (ej: "740895200001").
 */
export function esCodigoPatrimonialValido(codigo: string | null | undefined): boolean {
  if (!codigo) return false
  return /^\d{12}$/.test(codigo.trim())
}

/**
 * Valida los datos mínimos de un bien antes de registrarlo/consultarlo.
 * Devuelve la lista de errores encontrados (vacía si es válido).
 */
export function validarBien(bien: BienInput): ResultadoValidacion {
  const errores: string[] = []

  if (!bien.codigoPatrimonial || bien.codigoPatrimonial.trim() === "") {
    errores.push("El código patrimonial es obligatorio")
  } else if (!esCodigoPatrimonialValido(bien.codigoPatrimonial)) {
    errores.push("El código patrimonial debe tener 12 dígitos numéricos")
  }

  if (!bien.descripcion || bien.descripcion.trim() === "") {
    errores.push("La descripción es obligatoria")
  }

  if (bien.valorCompra != null && bien.valorCompra < 0) {
    errores.push("El valor de compra no puede ser negativo")
  }

  return { valido: errores.length === 0, errores }
}

// ---------------------------------------------------------------------------
// 2) CÁLCULO / FORMATO DE REPORTES
// ---------------------------------------------------------------------------

/**
 * Formatea un valor monetario en soles peruanos (S/).
 * Valores nulos se muestran como "S/ 0.00".
 */
export function formatearMoneda(valor: number | null | undefined): string {
  const n = valor ?? 0
  return `S/ ${n.toFixed(2)}`
}

/**
 * Formatea una fecha como DD/MM/AAAA. Devuelve "" si la fecha es inválida.
 */
export function formatearFechaCorta(fecha: Date | string | null | undefined): string {
  if (!fecha) return ""
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (isNaN(d.getTime())) return ""
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const anio = d.getFullYear()
  return `${dia}/${mes}/${anio}`
}

/**
 * Cuenta usuarios/registros por estado activo/inactivo (fila de totales
 * de los reportes de Excel).
 */
export function contarPorEstado(
  registros: { activo: boolean }[]
): { total: number; activos: number; inactivos: number } {
  const activos = registros.filter((r) => r.activo).length
  return {
    total: registros.length,
    activos,
    inactivos: registros.length - activos,
  }
}

/**
 * Suma el valor de compra de una lista de bienes (total de un reporte).
 */
export function sumarValorBienes(bienes: { valorCompra?: number | null }[]): number {
  return bienes.reduce((acc, b) => acc + (b.valorCompra ?? 0), 0)
}

// ---------------------------------------------------------------------------
// 3) HASH PARA FIRMA PERÚ
// ---------------------------------------------------------------------------

import crypto from "crypto"

/**
 * Genera el hash SHA-256 (hex) de un documento, igual que el usado al
 * cargar un archivo firmado en el flujo de Firma Perú.
 */
export function generarHashSha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

// ---------------------------------------------------------------------------
// 4) PERMISOS POR ROL
// ---------------------------------------------------------------------------

export interface Permiso {
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

export type PermisosMap = Record<string, Permiso>

export interface PermisoRolDB {
  modulo: string
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
  reportes: boolean
}

/**
 * Construye el mapa de permisos de un rol.
 * - Si esAdmin es true, todos los módulos tienen todos los permisos.
 * - En caso contrario, inicializa todos los módulos en false y los
 *   sobrescribe con los permisos guardados en la base de datos.
 */
export function construirPermisosMap(
  esAdmin: boolean,
  permisosDB: PermisoRolDB[],
  modulos: string[]
): PermisosMap {
  const map: PermisosMap = {}

  for (const modulo of modulos) {
    map[modulo] = {
      ver: esAdmin,
      crear: esAdmin,
      editar: esAdmin,
      eliminar: esAdmin,
      reportes: esAdmin,
    }
  }

  if (!esAdmin) {
    for (const p of permisosDB) {
      map[p.modulo] = {
        ver: p.ver,
        crear: p.crear,
        editar: p.editar,
        eliminar: p.eliminar,
        reportes: p.reportes,
      }
    }
  }

  return map
}

// ---------------------------------------------------------------------------
// 5) VALIDACIÓN DE CREDENCIALES / CORREO INSTITUCIONAL
// ---------------------------------------------------------------------------

/**
 * Verifica que el correo pertenezca al dominio institucional de UNAMAD.
 * (Misma regla que aplica el login con Google.)
 */
export function esEmailInstitucional(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^\s@]+@unamad\.edu\.pe$/i.test(email.trim())
}

/**
 * Validación de los campos de entrada del login (antes de tocar la BD).
 */
export function validarEntradaLogin(
  email: string | null | undefined,
  password: string | null | undefined
): ResultadoValidacion {
  const errores: string[] = []
  if (!email || email.trim() === "") errores.push("El email es requerido")
  if (!password || password === "") errores.push("La contraseña es requerida")
  return { valido: errores.length === 0, errores }
}
