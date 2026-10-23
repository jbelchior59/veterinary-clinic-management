-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Marcacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'AGENDADA',
    "animalId" INTEGER NOT NULL,
    CONSTRAINT "Marcacao_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Marcacao" ("animalId", "data", "id", "motivo") SELECT "animalId", "data", "id", "motivo" FROM "Marcacao";
DROP TABLE "Marcacao";
ALTER TABLE "new_Marcacao" RENAME TO "Marcacao";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
