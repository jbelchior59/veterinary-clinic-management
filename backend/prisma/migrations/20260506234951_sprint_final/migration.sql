-- AlterTable
ALTER TABLE "Animal" ADD COLUMN "alergias" TEXT;
ALTER TABLE "Animal" ADD COLUMN "alertasClinicos" TEXT;

-- AlterTable
ALTER TABLE "Consulta" ADD COLUMN "pesoRegistado" REAL;

-- CreateTable
CREATE TABLE "Vacina" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "lote" TEXT,
    "fabricante" TEXT,
    "dataAplicacao" DATETIME NOT NULL,
    "proximaDose" DATETIME,
    "observacoes" TEXT,
    "animalId" INTEGER NOT NULL,
    "aplicadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vacina_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vacina_aplicadoPorId_fkey" FOREIGN KEY ("aplicadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" REAL NOT NULL DEFAULT 0,
    "quantidadeMin" REAL NOT NULL DEFAULT 0,
    "lote" TEXT,
    "validade" DATETIME,
    "localizacao" TEXT,
    "fornecedor" TEXT,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StockMovimento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "motivo" TEXT,
    "itemId" INTEGER NOT NULL,
    "registadoPorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovimento_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "StockItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovimento_registadoPorId_fkey" FOREIGN KEY ("registadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServicoCatalogo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "preco" REAL NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FaturaLinha" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descricao" TEXT NOT NULL,
    "quantidade" REAL NOT NULL DEFAULT 1,
    "precoUnit" REAL NOT NULL,
    "total" REAL NOT NULL,
    "faturaId" INTEGER NOT NULL,
    "servicoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FaturaLinha_faturaId_fkey" FOREIGN KEY ("faturaId") REFERENCES "Fatura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FaturaLinha_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "ServicoCatalogo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Vacina_animalId_idx" ON "Vacina"("animalId");

-- CreateIndex
CREATE INDEX "Vacina_proximaDose_idx" ON "Vacina"("proximaDose");

-- CreateIndex
CREATE INDEX "StockItem_categoria_idx" ON "StockItem"("categoria");

-- CreateIndex
CREATE INDEX "StockMovimento_itemId_idx" ON "StockMovimento"("itemId");

-- CreateIndex
CREATE INDEX "StockMovimento_tipo_idx" ON "StockMovimento"("tipo");

-- CreateIndex
CREATE INDEX "ServicoCatalogo_categoria_idx" ON "ServicoCatalogo"("categoria");

-- CreateIndex
CREATE INDEX "ServicoCatalogo_ativo_idx" ON "ServicoCatalogo"("ativo");

-- CreateIndex
CREATE INDEX "FaturaLinha_faturaId_idx" ON "FaturaLinha"("faturaId");
