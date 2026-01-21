-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_download_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unused',
    "password" TEXT,
    "maxDownloads" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "fileId" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "download_tokens_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "download_tokens_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_download_tokens" ("createdAt", "fileId", "id", "status", "token", "usedAt", "usedBy") SELECT "createdAt", "fileId", "id", "status", "token", "usedAt", "usedBy" FROM "download_tokens";
DROP TABLE "download_tokens";
ALTER TABLE "new_download_tokens" RENAME TO "download_tokens";
CREATE UNIQUE INDEX "download_tokens_token_key" ON "download_tokens"("token");
CREATE INDEX "download_tokens_fileId_idx" ON "download_tokens"("fileId");
CREATE INDEX "download_tokens_status_createdAt_idx" ON "download_tokens"("status", "createdAt");
CREATE INDEX "download_tokens_usedBy_usedAt_idx" ON "download_tokens"("usedBy", "usedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
