-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "sourceResourceId" TEXT,
    "sourceResourceType" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Songbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "forkedFromId" TEXT,
    "outputSettings" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Songbook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Songbook_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "Songbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Songbook" ("createdAt", "forkedFromId", "id", "isArchived", "isPublic", "ownerId", "updatedAt") SELECT "createdAt", "forkedFromId", "id", "isArchived", "isPublic", "ownerId", "updatedAt" FROM "Songbook";
DROP TABLE "Songbook";
ALTER TABLE "new_Songbook" RENAME TO "Songbook";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ActivityLog_resourceType_resourceId_idx" ON "ActivityLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
