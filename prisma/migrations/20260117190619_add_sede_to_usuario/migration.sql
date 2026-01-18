-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "sedeId" TEXT;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
