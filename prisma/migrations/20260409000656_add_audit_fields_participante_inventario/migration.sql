-- AlterTable
ALTER TABLE "participantes_inventario" ADD COLUMN     "agregadoPorId" TEXT,
ADD COLUMN     "agregadoPorNombre" TEXT,
ADD COLUMN     "fechaRemovido" TIMESTAMP(3),
ADD COLUMN     "removidoPorId" TEXT,
ADD COLUMN     "removidoPorNombre" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "rol" SET DEFAULT 'INVENTARIADOR';
