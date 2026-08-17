# Anexo 7 con firma digital FIRMA PERÚ

**Fecha:** 2026-08-09
**Estado:** Aprobado por el usuario

## Problema

El Anexo 7 (Formato de Ficha de Levantamiento de Información) de una sesión de
inventario se genera solo en Excel y se firma en papel. Se necesita que el
personal inventariador lo firme digitalmente con FIRMA PERÚ y que el usuario
que recibe sus bienes también pueda firmar digitalmente la recepción.

## Decisiones acordadas

- La firma del usuario receptor es **opcional**: puede aceptar su asignación
  sin firmar (no todos tienen certificado digital) y firmar después.
- El **Excel se mantiene** como descarga; el **PDF** es la versión firmable.
- Se reutiliza la infraestructura FIRMA PERÚ existente (`FirmaModal`,
  `use-firma-peru`, `/api/firma-peru/*`).
- Regenerar el PDF invalida firmas previas (se limpian fechas), con
  confirmación en la UI.

## Flujo

1. Inventariador genera el Anexo 7 PDF de una persona y lo firma (motivo AUTOR).
2. Envía la asignación al usuario (flujo existente `PENDIENTE → ENVIADO`).
3. El usuario, en Mis Bienes, ve el PDF y puede firmar la recepción (motivo
   V°B°) al aceptar o después. PAdES acumula ambas firmas en el mismo archivo.

## Diseño

### Base de datos

`AsignacionInventario` gana 4 campos opcionales:
`anexo7Url String?`, `anexo7GeneradoAt DateTime?`,
`anexo7FirmaInventariadorAt DateTime?`, `anexo7FirmaUsuarioAt DateTime?`.

### Backend

- `lib/generar-anexo7.ts`: PDF A4 horizontal con pdf-lib. Cabecera
  institucional, datos de usuario/dependencia/inventariadores, tabla de bienes
  (mismas columnas que el Excel), leyendas, consideraciones y dos áreas de
  firma (Usuario / Personal Inventariador).
- `POST /api/inventario/asignaciones/[id]/anexo7`: genera el PDF desde las
  verificaciones de la asignación, lo guarda en
  `uploads/inventario/anexo7/<año>/<sesión>/`, registra url y fecha en la
  asignación y limpia fechas de firma previas.
- `GET` del mismo endpoint (o url directa) para ver/descargar el PDF.
- `/api/firma-peru/lote/[codigo]/cargar`: tercera rama — si el `archivoId`
  corresponde a una `AsignacionInventario`, sobreescribe su `anexo7Url` con el
  PDF firmado y marca `anexo7FirmaInventariadorAt` (si aún no está) o
  `anexo7FirmaUsuarioAt` (si la primera ya existe).

### UI

- **Sesión de inventario** (pestaña reporte por usuarios): junto al botón
  Excel, botones "Anexo 7 PDF" (generar/regenerar + ver) y "Firmar" (abre
  `FirmaModal` con `{id: asignacionId, url: anexo7Url}`). Muestra estado de
  firmas.
- **Mis Bienes**: en la asignación, enlace al PDF y botón "Firmar recepción"
  visible cuando el inventariador ya firmó; usa `FirmaModal` con motivo V°B°.

### Errores

- Firmar sin PDF generado → botón deshabilitado.
- Cliente FIRMA PERÚ no instalado/certificado ausente → error mostrado por el
  modal existente.
- Usuario intenta firmar antes que el inventariador → botón oculto/deshabilitado.

### Fuera de alcance

- Validación en línea de los certificados (la hace el cliente FIRMA PERÚ).
- Firma de otros documentos del módulo de inventario.
