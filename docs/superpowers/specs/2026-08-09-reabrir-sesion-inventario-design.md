# Reabrir sesión de inventario (solo administrador)

**Fecha:** 2026-08-09
**Estado:** Aprobado por el usuario

## Problema

En `/dashboard/patrimonio/inventario`, una sesión en estado `FINALIZADA` o
`CANCELADA` es terminal: no existe ninguna acción para reactivarla. Si un
inventario se cerró por error o requiere correcciones, hoy no hay forma de
continuarlo.

## Decisiones acordadas

- Al reabrir, la sesión vuelve al estado **`EN_PROCESO`** (activa de inmediato).
- Se pueden reabrir sesiones **`FINALIZADA` y `CANCELADA`**.
- Solo el rol **`ADMIN`** puede reabrir (verificado en el servidor).
- Se deja rastro en `observaciones`: `[Reabierta por {nombre apellidos} el {fecha}]`,
  conservando las observaciones previas. Sin cambios de esquema en BD.

## Diseño

### Backend — `app/api/inventario/sesiones/[id]/route.ts`

Nueva acción `reabrir` en el `PUT`, siguiendo el patrón existente de
`iniciar`/`pausar`/`finalizar`/`cancelar`:

1. Si `session.rol !== "ADMIN"` → 403 `"Solo el administrador puede reabrir una sesión"`.
2. Si el estado no es `FINALIZADA` ni `CANCELADA` → 400
   `"Solo se puede reabrir una sesión finalizada o cancelada"`.
3. Actualiza: `estado: "EN_PROCESO"`, `fechaFin: null`, y agrega la línea de
   auditoría a `observaciones` (con salto de línea si ya había texto).
   El nombre del admin se obtiene de la BD con `session.id`.

### UI — Lista (`app/dashboard/patrimonio/inventario/page.tsx`)

- Al cargar, consulta `/api/auth/me` (patrón ya usado en otras páginas) y guarda
  `esAdmin` en estado.
- En el menú de acciones de sesiones `FINALIZADA` o `CANCELADA`, solo si
  `esAdmin`, aparece **"Reabrir"** (ícono `RotateCcw`).
- Antes de ejecutar muestra confirmación (mismo mecanismo que las demás
  acciones destructivas de la página).

### UI — Detalle (`app/dashboard/patrimonio/inventario/[id]/page.tsx`)

- Mismo botón "Reabrir" para el admin cuando la sesión está `FINALIZADA` o
  `CANCELADA`, junto a los botones Iniciar/Pausar/Finalizar existentes.

### Errores

- API responde 403/400 con mensajes claros; la UI los muestra con el mismo
  sistema de alertas ya presente.

### Fuera de alcance

- Cambios de esquema/migraciones.
- Reapertura por roles distintos de ADMIN o por permisos granulares (`PermisoRol`).
- Historial estructurado de reaperturas.
