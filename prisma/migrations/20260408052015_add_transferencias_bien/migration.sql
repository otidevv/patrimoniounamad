-- CreateEnum
CREATE TYPE "EstadoTransferencia" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "transferencias_bien" (
    "id" TEXT NOT NULL,
    "verificacionId" TEXT NOT NULL,
    "codigoPatrimonial" TEXT NOT NULL,
    "descripcionBien" TEXT,
    "remitenteId" TEXT,
    "dniRemitente" TEXT NOT NULL,
    "nombreRemitente" TEXT NOT NULL,
    "destinatarioId" TEXT,
    "dniDestinatario" TEXT NOT NULL,
    "nombreDestinatario" TEXT NOT NULL,
    "verificacionDestinoId" TEXT,
    "estado" "EstadoTransferencia" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "observacionesDestinatario" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRespuesta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_bien_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transferencias_bien" ADD CONSTRAINT "transferencias_bien_verificacionId_fkey" FOREIGN KEY ("verificacionId") REFERENCES "verificaciones_bien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_bien" ADD CONSTRAINT "transferencias_bien_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_bien" ADD CONSTRAINT "transferencias_bien_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_bien" ADD CONSTRAINT "transferencias_bien_verificacionDestinoId_fkey" FOREIGN KEY ("verificacionDestinoId") REFERENCES "verificaciones_bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
