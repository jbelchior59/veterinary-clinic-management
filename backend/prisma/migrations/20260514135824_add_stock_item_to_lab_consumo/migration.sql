-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LabConsumo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exameId" INTEGER NOT NULL,
    "registadoPorId" INTEGER,
    "stockItemId" INTEGER,
    "item" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "unidade" TEXT NOT NULL,
    "lote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabConsumo_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabConsumo_registadoPorId_fkey" FOREIGN KEY ("registadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LabConsumo_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LabConsumo" ("createdAt", "exameId", "id", "item", "lote", "quantidade", "registadoPorId", "unidade") SELECT "createdAt", "exameId", "id", "item", "lote", "quantidade", "registadoPorId", "unidade" FROM "LabConsumo";
DROP TABLE "LabConsumo";
ALTER TABLE "new_LabConsumo" RENAME TO "LabConsumo";
CREATE INDEX "LabConsumo_exameId_idx" ON "LabConsumo"("exameId");
CREATE INDEX "LabConsumo_registadoPorId_idx" ON "LabConsumo"("registadoPorId");
CREATE INDEX "LabConsumo_stockItemId_idx" ON "LabConsumo"("stockItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
