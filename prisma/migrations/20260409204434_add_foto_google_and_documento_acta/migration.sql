-- AlterTable
ALTER TABLE "transferencias_bien" ADD COLUMN     "documentoActaId" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "fotoGoogle" TEXT;

-- AddForeignKey
ALTER TABLE "transferencias_bien" ADD CONSTRAINT "transferencias_bien_documentoActaId_fkey" FOREIGN KEY ("documentoActaId") REFERENCES "documentos_tramite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
