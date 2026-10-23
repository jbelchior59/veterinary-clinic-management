-- AlterTable
ALTER TABLE "Dono" ADD COLUMN "morada" TEXT;

-- AlterTable
ALTER TABLE "Tratamento" ADD COLUMN "dataFim" DATETIME;
ALTER TABLE "Tratamento" ADD COLUMN "dataInicio" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "nome" TEXT;

-- CreateTable
CREATE TABLE "Laboratorio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INTERNO',
    "especialidade" TEXT,
    "contacto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Exame" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDENTE',
    "descricaoClinica" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "dataPedido" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" DATETIME,
    "animalId" INTEGER NOT NULL,
    "solicitanteId" INTEGER,
    "laboratorioId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exame_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exame_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Exame_laboratorioId_fkey" FOREIGN KEY ("laboratorioId") REFERENCES "Laboratorio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Amostra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'INTERNA',
    "observacoes" TEXT,
    "dataColheita" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exameId" INTEGER NOT NULL,
    "registadaPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Amostra_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Amostra_registadaPorId_fkey" FOREIGN KEY ("registadaPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resultado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parametro" TEXT,
    "valor" TEXT,
    "unidade" TEXT,
    "referencia" TEXT,
    "dados" TEXT NOT NULL,
    "observacoes" TEXT,
    "validado" BOOLEAN NOT NULL DEFAULT false,
    "dataResultado" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataValidacao" DATETIME,
    "exameId" INTEGER NOT NULL,
    "relatorioId" INTEGER,
    "inseridoPorId" INTEGER,
    "validadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resultado_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Resultado_relatorioId_fkey" FOREIGN KEY ("relatorioId") REFERENCES "Relatorio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Resultado_inseridoPorId_fkey" FOREIGN KEY ("inseridoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Resultado_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Relatorio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conclusao" TEXT NOT NULL,
    "observacoes" TEXT,
    "recomendacoes" TEXT,
    "dataEmissao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exameId" INTEGER NOT NULL,
    "emitidoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Relatorio_exameId_fkey" FOREIGN KEY ("exameId") REFERENCES "Exame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Relatorio_emitidoPorId_fkey" FOREIGN KEY ("emitidoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Animal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "especie" TEXT NOT NULL,
    "raca" TEXT,
    "genero" TEXT,
    "dataNascimento" DATETIME,
    "peso" REAL,
    "donoId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Animal_donoId_fkey" FOREIGN KEY ("donoId") REFERENCES "Dono" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Animal" ("donoId", "especie", "id", "nome") SELECT "donoId", "especie", "id", "nome" FROM "Animal";
DROP TABLE "Animal";
ALTER TABLE "new_Animal" RENAME TO "Animal";
CREATE INDEX "Animal_donoId_idx" ON "Animal"("donoId");
CREATE TABLE "new_Consulta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "observacoes" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "veterinarioId" INTEGER,
    "animalId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Consulta_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Consulta_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Consulta" ("animalId", "createdAt", "data", "diagnostico", "id", "observacoes") SELECT "animalId", "createdAt", "data", "diagnostico", "id", "observacoes" FROM "Consulta";
DROP TABLE "Consulta";
ALTER TABLE "new_Consulta" RENAME TO "Consulta";
CREATE INDEX "Consulta_animalId_data_idx" ON "Consulta"("animalId", "data");
CREATE TABLE "new_Marcacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'AGENDADA',
    "criadoPorId" INTEGER,
    "animalId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Marcacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Marcacao_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Marcacao" ("animalId", "createdAt", "data", "estado", "id", "motivo") SELECT "animalId", "createdAt", "data", "estado", "id", "motivo" FROM "Marcacao";
DROP TABLE "Marcacao";
ALTER TABLE "new_Marcacao" RENAME TO "Marcacao";
CREATE INDEX "Marcacao_animalId_data_idx" ON "Marcacao"("animalId", "data");
CREATE INDEX "Marcacao_estado_idx" ON "Marcacao"("estado");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Laboratorio_nome_key" ON "Laboratorio"("nome");

-- CreateIndex
CREATE INDEX "Exame_animalId_idx" ON "Exame"("animalId");

-- CreateIndex
CREATE INDEX "Exame_estado_idx" ON "Exame"("estado");

-- CreateIndex
CREATE INDEX "Exame_solicitanteId_idx" ON "Exame"("solicitanteId");

-- CreateIndex
CREATE INDEX "Exame_laboratorioId_idx" ON "Exame"("laboratorioId");

-- CreateIndex
CREATE UNIQUE INDEX "Amostra_codigo_key" ON "Amostra"("codigo");

-- CreateIndex
CREATE INDEX "Amostra_exameId_idx" ON "Amostra"("exameId");

-- CreateIndex
CREATE INDEX "Resultado_exameId_idx" ON "Resultado"("exameId");

-- CreateIndex
CREATE INDEX "Resultado_validado_idx" ON "Resultado"("validado");

-- CreateIndex
CREATE UNIQUE INDEX "Relatorio_exameId_key" ON "Relatorio"("exameId");

-- CreateIndex
CREATE INDEX "Tratamento_consultaId_idx" ON "Tratamento"("consultaId");
