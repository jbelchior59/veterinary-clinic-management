-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Marcacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'AGENDADA',
    "criadoPorId" INTEGER,
    "profissionalId" INTEGER,
    "animalId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Marcacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Marcacao_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Marcacao_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Marcacao" ("animalId", "createdAt", "criadoPorId", "data", "estado", "id", "motivo") SELECT "animalId", "createdAt", "criadoPorId", "data", "estado", "id", "motivo" FROM "Marcacao";
DROP TABLE "Marcacao";
ALTER TABLE "new_Marcacao" RENAME TO "Marcacao";
CREATE INDEX "Marcacao_animalId_data_idx" ON "Marcacao"("animalId", "data");
CREATE INDEX "Marcacao_estado_idx" ON "Marcacao"("estado");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
