-- CreateEnum
CREATE TYPE "EstadoSesionInventario" AS ENUM ('PROGRAMADA', 'EN_PROCESO', 'PAUSADA', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoFisicoBien" AS ENUM ('BUENO', 'REGULAR', 'MALO', 'INOPERATIVO', 'CHATARRA');

-- CreateEnum
CREATE TYPE "ResultadoVerificacion" AS ENUM ('ENCONTRADO', 'REUBICADO', 'NO_ENCONTRADO', 'SOBRANTE');

-- CreateTable
CREATE TABLE "sesiones_inventario" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "dependenciaId" TEXT,
    "sedeId" TEXT,
    "ubicacionFisica" TEXT,
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoSesionInventario" NOT NULL DEFAULT 'PROGRAMADA',
    "responsableId" TEXT NOT NULL,
    "totalBienesSiga" INTEGER NOT NULL DEFAULT 0,
    "totalVerificados" INTEGER NOT NULL DEFAULT 0,
    "totalEncontrados" INTEGER NOT NULL DEFAULT 0,
    "totalReubicados" INTEGER NOT NULL DEFAULT 0,
    "totalNoEncontrados" INTEGER NOT NULL DEFAULT 0,
    "totalSobrantes" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sesiones_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participantes_inventario" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'VERIFICADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participantes_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificaciones_bien" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "codigoPatrimonial" TEXT NOT NULL,
    "descripcionSiga" TEXT,
    "marcaSiga" TEXT,
    "modeloSiga" TEXT,
    "serieSiga" TEXT,
    "colorSiga" TEXT,
    "responsableSiga" TEXT,
    "usuarioSiga" TEXT,
    "dependenciaSiga" TEXT,
    "ubicacionSiga" TEXT,
    "valorSiga" DOUBLE PRECISION,
    "resultado" "ResultadoVerificacion" NOT NULL DEFAULT 'ENCONTRADO',
    "estadoFisico" "EstadoFisicoBien",
    "ubicacionReal" TEXT,
    "responsableReal" TEXT,
    "observaciones" TEXT,
    "fotoUrl" TEXT,
    "verificadorId" TEXT NOT NULL,
    "fechaVerificacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispositivoTipo" TEXT,
    "dispositivoInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verificaciones_bien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bienes_sobrantes" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "serie" TEXT,
    "color" TEXT,
    "estadoFisico" "EstadoFisicoBien",
    "ubicacionEncontrado" TEXT,
    "codigoAntiguo" TEXT,
    "fotoUrl" TEXT,
    "observaciones" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bienes_sobrantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_inventario_codigo_key" ON "sesiones_inventario"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "participantes_inventario_sesionId_usuarioId_key" ON "participantes_inventario"("sesionId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "verificaciones_bien_sesionId_codigoPatrimonial_key" ON "verificaciones_bien"("sesionId", "codigoPatrimonial");

-- AddForeignKey
ALTER TABLE "sesiones_inventario" ADD CONSTRAINT "sesiones_inventario_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "dependencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_inventario" ADD CONSTRAINT "sesiones_inventario_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_inventario" ADD CONSTRAINT "sesiones_inventario_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes_inventario" ADD CONSTRAINT "participantes_inventario_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes_inventario" ADD CONSTRAINT "participantes_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verificaciones_bien" ADD CONSTRAINT "verificaciones_bien_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verificaciones_bien" ADD CONSTRAINT "verificaciones_bien_verificadorId_fkey" FOREIGN KEY ("verificadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bienes_sobrantes" ADD CONSTRAINT "bienes_sobrantes_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bienes_sobrantes" ADD CONSTRAINT "bienes_sobrantes_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
