-- AlterTable
ALTER TABLE "documentos_destino" ADD COLUMN     "destinatarioId" TEXT;

-- AddForeignKey
ALTER TABLE "documentos_destino" ADD CONSTRAINT "documentos_destino_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
