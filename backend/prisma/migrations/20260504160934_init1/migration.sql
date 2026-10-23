-- CreateIndex
CREATE INDEX "FinancialTransaction_tipo_idx" ON "FinancialTransaction"("tipo");

-- CreateIndex
CREATE INDEX "FinancialTransaction_categoria_idx" ON "FinancialTransaction"("categoria");

-- CreateIndex
CREATE INDEX "FinancialTransaction_createdAt_idx" ON "FinancialTransaction"("createdAt");
