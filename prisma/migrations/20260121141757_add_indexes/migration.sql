-- CreateIndex
CREATE INDEX "download_tokens_fileId_idx" ON "download_tokens"("fileId");

-- CreateIndex
CREATE INDEX "download_tokens_status_createdAt_idx" ON "download_tokens"("status", "createdAt");

-- CreateIndex
CREATE INDEX "download_tokens_usedBy_usedAt_idx" ON "download_tokens"("usedBy", "usedAt");

-- CreateIndex
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");
