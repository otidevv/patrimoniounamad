// Utilidades para la sesión de inventario "de sistema".
//
// Cuando se genera un Acta de Entrega a partir de bienes que provienen
// directamente de SIGA (no de una verificación de inventario), esos bienes no
// tienen un registro `VerificacionBien` —que es lo que requiere el sistema de
// transferencias y actas—. Para resolverlo se "materializan": se crea una
// `VerificacionBien` auto-aceptada a nombre del usuario dentro de una sesión
// interna por usuario.
//
// Estas sesiones son internas y NO deben aparecer en listados de inventario ni
// contar en las métricas del dashboard. Se identifican por el prefijo de su
// código.

export const PREFIJO_SESION_SISTEMA = "__TD__"

// Código de la sesión interna de "transferencias directas" de un usuario.
export function codigoSesionTransferenciaDirecta(usuarioId: string) {
  return `${PREFIJO_SESION_SISTEMA}${usuarioId}`
}

// Filtro Prisma para EXCLUIR las sesiones de sistema (usar en listados/métricas).
export const excluirSesionesSistema = {
  NOT: { codigo: { startsWith: PREFIJO_SESION_SISTEMA } },
}

// Filtro Prisma para EXCLUIR las verificaciones que viven en sesiones de sistema.
export const excluirVerificacionesSistema = {
  NOT: { sesion: { codigo: { startsWith: PREFIJO_SESION_SISTEMA } } },
}
