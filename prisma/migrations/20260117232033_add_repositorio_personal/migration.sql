-- AlterTable
ALTER TABLE "archivos_adjuntos" ADD COLUMN     "archivoRepositorioId" TEXT;

-- CreateTable
CREATE TABLE "carpetas_repositorio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT,
    "usuarioId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carpetas_repositorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_repositorio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'application/pdf',
    "tamanio" INTEGER NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "carpetaId" TEXT,
    "firmado" BOOLEAN NOT NULL DEFAULT false,
    "fechaFirma" TIMESTAMP(3),
    "hashArchivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archivos_repositorio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "archivos_adjuntos" ADD CONSTRAINT "archivos_adjuntos_archivoRepositorioId_fkey" FOREIGN KEY ("archivoRepositorioId") REFERENCES "archivos_repositorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas_repositorio" ADD CONSTRAINT "carpetas_repositorio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas_repositorio" ADD CONSTRAINT "carpetas_repositorio_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "carpetas_repositorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_repositorio" ADD CONSTRAINT "archivos_repositorio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_repositorio" ADD CONSTRAINT "archivos_repositorio_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "carpetas_repositorio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
