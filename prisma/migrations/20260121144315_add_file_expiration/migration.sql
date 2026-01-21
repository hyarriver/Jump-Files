-- AlterTable
ALTER TABLE "files" ADD COLUMN "expiresAt" DATETIME;

-- CreateIndex
CREATE INDEX "files_expiresAt_idx" ON "files"("expiresAt");
