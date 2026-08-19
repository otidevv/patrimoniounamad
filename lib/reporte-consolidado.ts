/**
 * Lógica pura del reporte consolidado de sesiones de inventario.
 *
 * Se extrae aquí para poder probarla de forma aislada (Jest) y para
 * compartirla entre las páginas de reportes y los endpoints de exportación.
 */

// Campos de especificaciones técnicas que identifican un equipo de cómputo
export const CAMPOS_COMPUTO = [
  "procesador",
  "generacion",
  "sistemaOperativo",
  "ram",
  "disco",
] as const

export type EspecificacionesComputo = Partial<
  Record<(typeof CAMPOS_COMPUTO)[number], string | null>
>

/**
 * Un bien es equipo de cómputo si tiene alguna especificación técnica
 * registrada (procesador, generación, sistema operativo, RAM o disco).
 */
export function esEquipoComputo(v: EspecificacionesComputo): boolean {
  return CAMPOS_COMPUTO.some((campo) => Boolean(v[campo]))
}

/**
 * Fragmento `where` de Prisma para filtrar equipos de cómputo en la base de
 * datos: alguna especificación técnica no nula y no vacía.
 */
export function whereEquipoComputo(): {
  OR: Array<Record<string, { not: null; notIn: [""] }>>
} {
  return {
    OR: CAMPOS_COMPUTO.map((campo) => ({
      [campo]: { not: null, notIn: [""] as [""] },
    })),
  }
}

export interface SesionResumen {
  estado: string
  totalBienesSiga: number
  totalVerificados: number
  totalEncontrados: number
  totalReubicados: number
  totalNoEncontrados: number
  totalSobrantes: number
}

export interface ResumenConsolidado {
  totalSesiones: number
  sesionesFinalizadas: number
  sesionesEnProceso: number
  totalBienesSiga: number
  totalVerificados: number
  totalEncontrados: number
  totalReubicados: number
  totalNoEncontrados: number
  totalSobrantes: number
}

/** Suma los totales de un conjunto de sesiones para el resumen consolidado. */
export function resumenSesiones(sesiones: SesionResumen[]): ResumenConsolidado {
  return {
    totalSesiones: sesiones.length,
    sesionesFinalizadas: sesiones.filter((s) => s.estado === "FINALIZADA").length,
    sesionesEnProceso: sesiones.filter((s) => s.estado === "EN_PROCESO").length,
    totalBienesSiga: sesiones.reduce((acc, s) => acc + s.totalBienesSiga, 0),
    totalVerificados: sesiones.reduce((acc, s) => acc + s.totalVerificados, 0),
    totalEncontrados: sesiones.reduce((acc, s) => acc + s.totalEncontrados, 0),
    totalReubicados: sesiones.reduce((acc, s) => acc + s.totalReubicados, 0),
    totalNoEncontrados: sesiones.reduce((acc, s) => acc + s.totalNoEncontrados, 0),
    totalSobrantes: sesiones.reduce((acc, s) => acc + s.totalSobrantes, 0),
  }
}
