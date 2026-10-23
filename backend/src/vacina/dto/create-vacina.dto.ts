import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateVacinaDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  lote?: string;

  @IsOptional()
  @IsString()
  fabricante?: string;

  @IsDateString()
  dataAplicacao: string;

  @IsOptional()
  @IsDateString()
  proximaDose?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  animalId?: number;
}
