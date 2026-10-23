-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FinancialTransaction_tipo_idx" ON "FinancialTransaction"("tipo");

-- CreateIndex
CREATE INDEX "FinancialTransaction_categoria_idx" ON "FinancialTransaction"("categoria");

-- CreateIndex
CREATE INDEX "FinancialTransaction_createdAt_idx" ON "FinancialTransaction"("createdAt");
