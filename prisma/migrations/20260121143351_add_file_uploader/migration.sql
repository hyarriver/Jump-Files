-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "adminToken" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "originalName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_files" ("adminToken", "createdAt", "id", "objectKey", "size") SELECT "adminToken", "createdAt", "id", "objectKey", "size" FROM "files";
DROP TABLE "files";
ALTER TABLE "new_files" RENAME TO "files";
CREATE UNIQUE INDEX "files_objectKey_key" ON "files"("objectKey");
CREATE UNIQUE INDEX "files_adminToken_key" ON "files"("adminToken");
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");
CREATE INDEX "files_uploadedBy_idx" ON "files"("uploadedBy");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
