-- CreateTable
CREATE TABLE "Dono" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Dono_email_key" ON "Dono"("email");
