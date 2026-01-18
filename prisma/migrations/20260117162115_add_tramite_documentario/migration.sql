-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA', 'PTP', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDependencia" AS ENUM ('RECTORADO', 'VICERRECTORADO', 'FACULTAD', 'ESCUELA', 'OFICINA', 'DIRECCION', 'UNIDAD', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoBien" AS ENUM ('NUEVO', 'BUENO', 'REGULAR', 'MALO', 'MUY_MALO', 'CHATARRA');

-- CreateEnum
CREATE TYPE "SituacionBien" AS ENUM ('EN_USO', 'EN_DESUSO', 'BAJA', 'TRANSFERIDO', 'FALTANTE', 'SOBRANTE');

-- CreateEnum
CREATE TYPE "Modulo" AS ENUM ('DASHBOARD', 'BIENES', 'INVENTARIO', 'ALTAS', 'BAJAS', 'TRANSFERENCIAS', 'CATEGORIAS', 'DEPENDENCIAS', 'RESPONSABLES', 'REPORTES', 'DOCUMENTOS', 'ADMIN_PANEL', 'ROLES_PERMISOS', 'USUARIOS', 'CONFIGURACION', 'SEDES', 'TRAMITE');

-- CreateEnum
CREATE TYPE "EstadoDocumentoTramite" AS ENUM ('BORRADOR', 'ENVIADO', 'RECIBIDO', 'DERIVADO', 'OBSERVADO', 'ATENDIDO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoFirma" AS ENUM ('DIGITAL', 'ESCANEADO', 'NINGUNA');

-- CreateEnum
CREATE TYPE "AccionDocumento" AS ENUM ('CREADO', 'EDITADO', 'ENVIADO', 'RECIBIDO', 'DERIVADO', 'OBSERVADO', 'ATENDIDO', 'ARCHIVADO', 'FIRMADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('DOCUMENTO_RECIBIDO', 'DOCUMENTO_DERIVADO', 'DOCUMENTO_OBSERVADO', 'DOCUMENTO_ATENDIDO', 'DOCUMENTO_FIRMADO', 'RECORDATORIO');

-- CreateEnum
CREATE TYPE "PrioridadDocumento" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "EstadoRecepcion" AS ENUM ('PENDIENTE', 'RECIBIDO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL DEFAULT 'DNI',
    "numeroDocumento" TEXT,
    "cargo" TEXT,
    "telefono" TEXT,
    "foto" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "rolId" TEXT NOT NULL,
    "dependenciaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_usuarios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notificacionesEmail" BOOLEAN NOT NULL DEFAULT true,
    "notificacionesPush" BOOLEAN NOT NULL DEFAULT true,
    "idioma" TEXT NOT NULL DEFAULT 'es',
    "vistaCompacta" BOOLEAN NOT NULL DEFAULT false,
    "mostrarEstado" BOOLEAN NOT NULL DEFAULT true,
    "mostrarActividad" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencias" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "siglas" TEXT,
    "tipo" "TipoDependencia" NOT NULL,
    "sedeId" TEXT NOT NULL,
    "parentId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "ciudad" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_bienes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cuenta" TEXT NOT NULL,
    "grupoId" TEXT,
    "vidaUtil" INTEGER,
    "tasaDepreciacion" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_bienes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_bienes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_bienes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bienes" (
    "id" TEXT NOT NULL,
    "codigoPatrimonial" TEXT NOT NULL,
    "codigoSBN" TEXT,
    "descripcion" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "serie" TEXT,
    "color" TEXT,
    "dimensiones" TEXT,
    "caracteristicas" TEXT,
    "estado" "EstadoBien" NOT NULL DEFAULT 'BUENO',
    "situacion" "SituacionBien" NOT NULL DEFAULT 'EN_USO',
    "valorAdquisicion" DOUBLE PRECISION,
    "valorActual" DOUBLE PRECISION,
    "fechaAdquisicion" TIMESTAMP(3),
    "fechaAlta" TIMESTAMP(3),
    "documentoAlta" TEXT,
    "catalogoId" TEXT,
    "dependenciaId" TEXT,
    "ubicacion" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bienes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos_rol" (
    "id" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "modulo" "Modulo" NOT NULL,
    "ver" BOOLEAN NOT NULL DEFAULT false,
    "crear" BOOLEAN NOT NULL DEFAULT false,
    "editar" BOOLEAN NOT NULL DEFAULT false,
    "eliminar" BOOLEAN NOT NULL DEFAULT false,
    "reportes" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permisos_rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_documento_tramite" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "requiereFirma" BOOLEAN NOT NULL DEFAULT true,
    "prefijo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_documento_tramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_tramite" (
    "id" TEXT NOT NULL,
    "correlativo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "contenido" TEXT,
    "folios" INTEGER NOT NULL DEFAULT 1,
    "dependenciaOrigenId" TEXT NOT NULL,
    "remitenteId" TEXT NOT NULL,
    "estado" "EstadoDocumentoTramite" NOT NULL DEFAULT 'BORRADOR',
    "tipoFirma" "TipoFirma" NOT NULL DEFAULT 'NINGUNA',
    "archivoFirmadoUrl" TEXT,
    "firmaDigitalData" TEXT,
    "fechaFirma" TIMESTAMP(3),
    "prioridad" "PrioridadDocumento" NOT NULL DEFAULT 'NORMAL',
    "fechaDocumento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" TIMESTAMP(3),
    "fechaLimite" TIMESTAMP(3),
    "documentoReferenciaId" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_tramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_destino" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "dependenciaDestinoId" TEXT NOT NULL,
    "esCopia" BOOLEAN NOT NULL DEFAULT false,
    "estadoRecepcion" "EstadoRecepcion" NOT NULL DEFAULT 'PENDIENTE',
    "fechaRecepcion" TIMESTAMP(3),
    "receptorId" TEXT,
    "observacionRecepcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_destino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_adjuntos" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanio" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_historial" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "accion" "AccionDocumento" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dependenciaId" TEXT,
    "descripcion" TEXT,
    "estadoAnterior" "EstadoDocumentoTramite",
    "estadoNuevo" "EstadoDocumentoTramite",
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "documentoId" TEXT,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "enlace" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fechaLeido" TIMESTAMP(3),
    "enviadoEmail" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvioEmail" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_codigo_key" ON "roles"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tipoDocumento_numeroDocumento_key" ON "usuarios"("tipoDocumento", "numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_usuarios_userId_key" ON "configuracion_usuarios"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "dependencias_codigo_key" ON "dependencias"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "sedes_codigo_key" ON "sedes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_bienes_codigo_key" ON "catalogo_bienes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_bienes_codigo_key" ON "grupos_bienes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "bienes_codigoPatrimonial_key" ON "bienes"("codigoPatrimonial");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_rol_rolId_modulo_key" ON "permisos_rol"("rolId", "modulo");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_tramite_codigo_key" ON "tipos_documento_tramite"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_tramite_tipoDocumentoId_correlativo_anio_key" ON "documentos_tramite"("tipoDocumentoId", "correlativo", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_destino_documentoId_dependenciaDestinoId_key" ON "documentos_destino"("documentoId", "dependenciaDestinoId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "dependencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_usuarios" ADD CONSTRAINT "configuracion_usuarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias" ADD CONSTRAINT "dependencias_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias" ADD CONSTRAINT "dependencias_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "dependencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogo_bienes" ADD CONSTRAINT "catalogo_bienes_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_bienes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bienes" ADD CONSTRAINT "bienes_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "catalogo_bienes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bienes" ADD CONSTRAINT "bienes_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "dependencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_rol" ADD CONSTRAINT "permisos_rol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_tramite" ADD CONSTRAINT "documentos_tramite_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "tipos_documento_tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_tramite" ADD CONSTRAINT "documentos_tramite_dependenciaOrigenId_fkey" FOREIGN KEY ("dependenciaOrigenId") REFERENCES "dependencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_tramite" ADD CONSTRAINT "documentos_tramite_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_tramite" ADD CONSTRAINT "documentos_tramite_documentoReferenciaId_fkey" FOREIGN KEY ("documentoReferenciaId") REFERENCES "documentos_tramite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_destino" ADD CONSTRAINT "documentos_destino_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos_tramite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_destino" ADD CONSTRAINT "documentos_destino_dependenciaDestinoId_fkey" FOREIGN KEY ("dependenciaDestinoId") REFERENCES "dependencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_destino" ADD CONSTRAINT "documentos_destino_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_adjuntos" ADD CONSTRAINT "archivos_adjuntos_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos_tramite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_historial" ADD CONSTRAINT "documentos_historial_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos_tramite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_historial" ADD CONSTRAINT "documentos_historial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_historial" ADD CONSTRAINT "documentos_historial_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "dependencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos_tramite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
