# Búsqueda por serie en verificación de inventario

**Fecha:** 2026-08-09
**Estado:** Aprobado por el usuario

## Problema

En el detalle de una sesión de inventario (`/dashboard/patrimonio/inventario/[id]`),
el campo de búsqueda solo acepta código patrimonial (12 dígitos, búsqueda exacta).
Muchos bienes se identifican más rápido por su número de serie.

## Decisiones acordadas

- **Autodetección** en un solo campo: 12 dígitos numéricos → código patrimonial;
  cualquier otro texto de 4+ caracteres → serie.
- Serie sin coincidencias → aviso (toast), **no** abre flujo de sobrante.

## Diseño

- `buscarYVerificar` detecta el tipo de búsqueda. El flujo por código no cambia
  (incluye sobrante si no existe en SIGA). El flujo por serie usa
  `/api/patrimonio/buscar?serie=...` (API existente, coincidencia parcial):
  - 1 resultado → abre el diálogo de verificación precargado.
  - Varios → diálogo con la lista (código, descripción, serie, usuario) para elegir.
  - 0 → toast "No se encontró ningún bien con esa serie".
- Se extrae `abrirVerificacionConBien(bien)` para reutilizar entre ambos flujos.
- Campo: etiqueta "Código Patrimonial o Serie", placeholder "Código o serie...",
  `maxLength` 30. Escáner de pistola y cámara pasan por la misma autodetección.
- Sin cambios en backend ni base de datos.
