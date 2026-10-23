-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Amostra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'INTERNA',
    "estado" TEXT NOT NULL DEFAULT 'RECEBIDA',
    "motivoRejeicao" TEXT,
    "temperatura" TEXT,
    "localizacaoArmazenamento" TEXT,
    "observacoes" TEXT,
    "dataColheita" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRececao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadaEm" DATETIME,
    "exameId" INTEGER NOT NULL,
    "registadaPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Amostra_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Amostra_registadaPorId_fkey" FOREIGN KEY ("registadaPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Amostra" ("codigo", "createdAt", "dataColheita", "dataRececao", "estado", "exameId", "id", "localizacaoArmazenamento", "motivoRejeicao", "observacoes", "origem", "processadaEm", "registadaPorId", "temperatura", "tipo") SELECT "codigo", "createdAt", "dataColheita", "dataRececao", "estado", "exameId", "id", "localizacaoArmazenamento", "motivoRejeicao", "observacoes", "origem", "processadaEm", "registadaPorId", "temperatura", "tipo" FROM "Amostra";
DROP TABLE "Amostra";
ALTER TABLE "new_Amostra" RENAME TO "Amostra";
CREATE UNIQUE INDEX "Amostra_codigo_key" ON "Amostra"("codigo");
CREATE INDEX "Amostra_exameId_idx" ON "Amostra"("exameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
