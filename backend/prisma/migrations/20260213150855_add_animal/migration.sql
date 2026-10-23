/*
  Warnings:

  - You are about to drop the column `telefone` on the `Dono` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Animal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "especie" TEXT NOT NULL,
    "donoId" INTEGER NOT NULL,
    CONSTRAINT "Animal_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "Dono" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Dono" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL
);
INSERT INTO "new_Dono" ("email", "id", "nome") SELECT "email", "id", "nome" FROM "Dono";
DROP TABLE "Dono";
ALTER TABLE "new_Dono" RENAME TO "Dono";
CREATE UNIQUE INDEX "Dono_email_key" ON "Dono"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
