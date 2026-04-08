-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO', 'CERRADO');

-- AlterTable
ALTER TABLE "verificaciones_bien" ADD COLUMN     "asignacionId" TEXT;

-- CreateTable
CREATE TABLE "asignaciones_inventario" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipoDocumento" TEXT NOT NULL DEFAULT 'DNI',
    "numeroDocumento" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'PENDIENTE',
    "fechaEnvio" TIMESTAMP(3),
    "fechaRespuestaUsuario" TIMESTAMP(3),
    "fechaCierre" TIMESTAMP(3),
    "observacionesUsuario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaciones_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_inventario_sesionId_numeroDocumento_key" ON "asignaciones_inventario"("sesionId", "numeroDocumento");

-- AddForeignKey
ALTER TABLE "asignaciones_inventario" ADD CONSTRAINT "asignaciones_inventario_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesiones_inventario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_inventario" ADD CONSTRAINT "asignaciones_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verificaciones_bien" ADD CONSTRAINT "verificaciones_bien_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones_inventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
