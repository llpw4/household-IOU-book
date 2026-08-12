-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "partyType" TEXT NOT NULL DEFAULT 'RELATIVE',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Party" ("createdAt", "id", "name", "note") SELECT "createdAt", "id", "name", "note" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
CREATE UNIQUE INDEX "Party_name_key" ON "Party"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
