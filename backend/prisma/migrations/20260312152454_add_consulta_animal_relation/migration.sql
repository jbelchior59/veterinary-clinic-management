/*
  Warnings:

  - Added the required column `animalId` to the `Consulta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `diagnostico` to the `Consulta` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Consulta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "observacoes" TEXT,
    "diagnostico" TEXT NOT NULL,
    "animalId" INTEGER NOT NULL,
    CONSTRAINT "Consulta_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Consulta" ("data", "id", "observacoes") SELECT "data", "id", "observacoes" FROM "Consulta";
DROP TABLE "Consulta";
ALTER TABLE "new_Consulta" RENAME TO "Consulta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
