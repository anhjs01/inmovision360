-- AlterTable
ALTER TABLE "pagos" ADD COLUMN "comprobanteUrl" TEXT;
ALTER TABLE "pagos" ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'arrendador';
