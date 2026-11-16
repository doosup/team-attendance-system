-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isOverLimit" BOOLEAN NOT NULL,
    "isAfterDeadline" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "ip" TEXT,
    "halfOffPart" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "decidedById" INTEGER,
    "decidedAt" DATETIME,
    "rejectReason" TEXT,
    "accessChangedAt" DATETIME,
    "accessChangedById" INTEGER,
    "accessChangeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Request_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Request_accessChangedById_fkey" FOREIGN KEY ("accessChangedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("accessChangeReason", "accessChangedAt", "accessChangedById", "createdAt", "decidedAt", "decidedById", "endDate", "endTime", "halfOffPart", "id", "ip", "isAfterDeadline", "isOverLimit", "reason", "rejectReason", "startDate", "startTime", "status", "type", "updatedAt", "userId") SELECT "accessChangeReason", "accessChangedAt", "accessChangedById", "createdAt", "decidedAt", "decidedById", "endDate", "endTime", "halfOffPart", "id", "ip", "isAfterDeadline", "isOverLimit", "reason", "rejectReason", "startDate", "startTime", "status", "type", "updatedAt", "userId" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE INDEX "Request_userId_status_idx" ON "Request"("userId", "status");
CREATE INDEX "Request_status_startDate_idx" ON "Request"("status", "startDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
