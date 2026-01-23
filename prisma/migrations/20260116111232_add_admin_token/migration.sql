/*
  Warnings:

  - Added the required column `adminToken` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "adminToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_files" ("createdAt", "id", "objectKey", "size") SELECT "createdAt", "id", "objectKey", "size" FROM "files";
DROP TABLE "files";
ALTER TABLE "new_files" RENAME TO "files";
CREATE UNIQUE INDEX "files_objectKey_key" ON "files"("objectKey");
CREATE UNIQUE INDEX "files_adminToken_key" ON "files"("adminToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
