-- Expand laboratory technician workflow.
ALTER TABLE "Amostra" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'RECEBIDA';
ALTER TABLE "Amostra" ADD COLUMN "motivoRejeicao" TEXT;
ALTER TABLE "Amostra" ADD COLUMN "temperatura" TEXT;
ALTER TABLE "Amostra" ADD COLUMN "localizacaoArmazenamento" TEXT;
ALTER TABLE "Amostra" ADD COLUMN "dataRececao" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
ALTER TABLE "Amostra" ADD COLUMN "processadaEm" DATETIME;

ALTER TABLE "Resultado" ADD COLUMN "interpretacao" TEXT;

CREATE TABLE "ExameNotaInterna" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "exameId" INTEGER NOT NULL,
  "autorId" INTEGER,
  "conteudo" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExameNotaInterna_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ExameNotaInterna_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ExameAnexo" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "exameId" INTEGER NOT NULL,
  "autorId" INTEGER,
  "nome" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "tipo" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExameAnexo_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ExameAnexo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ExameAuditLog" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "exameId" INTEGER NOT NULL,
  "atorId" INTEGER,
  "acao" TEXT NOT NULL,
  "de" TEXT,
  "para" TEXT,
  "detalhe" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExameAuditLog_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ExameAuditLog_atorId_fkey" FOREIGN KEY ("atorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "LabConsumo" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "exameId" INTEGER NOT NULL,
  "registadoPorId" INTEGER,
  "item" TEXT NOT NULL,
  "quantidade" REAL NOT NULL,
  "unidade" TEXT NOT NULL,
  "lote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabConsumo_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LabConsumo_registadoPorId_fkey" FOREIGN KEY ("registadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ExameNotaInterna_exameId_idx" ON "ExameNotaInterna"("exameId");
CREATE INDEX "ExameNotaInterna_autorId_idx" ON "ExameNotaInterna"("autorId");
CREATE INDEX "ExameAnexo_exameId_idx" ON "ExameAnexo"("exameId");
CREATE INDEX "ExameAnexo_autorId_idx" ON "ExameAnexo"("autorId");
CREATE INDEX "ExameAuditLog_exameId_idx" ON "ExameAuditLog"("exameId");
CREATE INDEX "ExameAuditLog_atorId_idx" ON "ExameAuditLog"("atorId");
CREATE INDEX "ExameAuditLog_acao_idx" ON "ExameAuditLog"("acao");
CREATE INDEX "LabConsumo_exameId_idx" ON "LabConsumo"("exameId");
CREATE INDEX "LabConsumo_registadoPorId_idx" ON "LabConsumo"("registadoPorId");
