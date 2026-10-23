/*
  Warnings:

  - Added the required column `updatedAt` to the `ServicoCatalogo` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServicoCatalogo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "preco" REAL NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ServicoCatalogo" ("ativo", "categoria", "createdAt", "descricao", "id", "nome", "preco") SELECT "ativo", "categoria", "createdAt", "descricao", "id", "nome", "preco" FROM "ServicoCatalogo";
DROP TABLE "ServicoCatalogo";
ALTER TABLE "new_ServicoCatalogo" RENAME TO "ServicoCatalogo";
CREATE INDEX "ServicoCatalogo_categoria_idx" ON "ServicoCatalogo"("categoria");
CREATE INDEX "ServicoCatalogo_ativo_idx" ON "ServicoCatalogo"("ativo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
