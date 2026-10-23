-- Add tables for reception workflow
CREATE TABLE "Comunicacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "assunto" TEXT,
    "mensagem" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'REGISTADA',
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "animalId" INTEGER,
    "criadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comunicacao_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comunicacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Comunicacao_animalId_idx" ON "Comunicacao"("animalId");
CREATE INDEX "Comunicacao_criadoPorId_idx" ON "Comunicacao"("criadoPorId");
CREATE INDEX "Comunicacao_tipo_idx" ON "Comunicacao"("tipo");

CREATE TABLE "Fatura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataEmissao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" DATETIME,
    "animalId" INTEGER NOT NULL,
    "criadaPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Fatura_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Fatura_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Fatura_numero_key" ON "Fatura"("numero");
CREATE INDEX "Fatura_animalId_idx" ON "Fatura"("animalId");
CREATE INDEX "Fatura_estado_idx" ON "Fatura"("estado");
CREATE INDEX "Fatura_dataVencimento_idx" ON "Fatura"("dataVencimento");

CREATE TABLE "Pagamento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "valor" REAL NOT NULL,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "dataPagamento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "faturaId" INTEGER NOT NULL,
    "registadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pagamento_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "Fatura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pagamento_registadoPorId_fkey" FOREIGN KEY ("registadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Pagamento_faturaId_idx" ON "Pagamento"("faturaId");
CREATE INDEX "Pagamento_dataPagamento_idx" ON "Pagamento"("dataPagamento");

CREATE TABLE "HorarioProfissional" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "diaSemana" INTEGER NOT NULL,
    "horaEntrada" TEXT NOT NULL,
    "horaSaida" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT 1,
    "observacoes" TEXT,
    "userId" INTEGER NOT NULL,
    "criadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HorarioProfissional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HorarioProfissional_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HorarioProfissional_userId_idx" ON "HorarioProfissional"("userId");
CREATE INDEX "HorarioProfissional_diaSemana_ativo_idx" ON "HorarioProfissional"("diaSemana", "ativo");
