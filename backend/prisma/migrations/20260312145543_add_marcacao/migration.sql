-- CreateTable
CREATE TABLE "Marcacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL,
    "motivo" TEXT NOT NULL,
    "animalId" INTEGER NOT NULL,
    CONSTRAINT "Marcacao_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
