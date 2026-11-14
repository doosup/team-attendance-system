-- AlterTable
ALTER TABLE "Request" ADD COLUMN "accessChangeReason" TEXT;
ALTER TABLE "Request" ADD COLUMN "accessChangedAt" DATETIME;
ALTER TABLE "Request" ADD COLUMN "accessChangedById" INTEGER;
