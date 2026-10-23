-- Add estado column to HorarioProfissional so reception can track work status
ALTER TABLE "HorarioProfissional" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'ATIVO';
