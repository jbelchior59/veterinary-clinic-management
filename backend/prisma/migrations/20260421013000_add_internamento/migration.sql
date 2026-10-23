-- CreateTable
CREATE TABLE "Internamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dataEntrada" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAlta" DATETIME,
    "motivo" TEXT NOT NULL,
    "observacoes" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ATIVO',
    "animalId" INTEGER NOT NULL,
    "veterinarioId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Internamento_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Internamento_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InternamentoObservacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sinaisVitais" TEXT,
    "alimentacao" TEXT,
    "medicacao" TEXT,
    "observacoes" TEXT NOT NULL,
    "internamentoId" INTEGER NOT NULL,
    "registadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternamentoObservacao_internamentoId_fkey" FOREIGN KEY ("internamentoId") REFERENCES "Internamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InternamentoObservacao_registadoPorId_fkey" FOREIGN KEY ("registadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Internamento_animalId_idx" ON "Internamento"("animalId");

-- CreateIndex
CREATE INDEX "Internamento_estado_idx" ON "Internamento"("estado");

-- CreateIndex
CREATE INDEX "Internamento_veterinarioId_idx" ON "Internamento"("veterinarioId");

-- CreateIndex
CREATE INDEX "InternamentoObservacao_internamentoId_idx" ON "InternamentoObservacao"("internamentoId");

-- CreateIndex
CREATE INDEX "InternamentoObservacao_registadoPorId_idx" ON "InternamentoObservacao"("registadoPorId");
