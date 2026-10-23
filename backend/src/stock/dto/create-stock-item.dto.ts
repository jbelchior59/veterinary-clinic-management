import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateStockItemDto {
  @ApiProperty({ example: "PCR Master Mix" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @ApiProperty({ example: "Biologia Molecular" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  categoria: string;

  @ApiProperty({ example: "frascos" })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  unidade: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantidade?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantidadeMin?: number;

  @ApiPropertyOptional({ example: "PCR-9921" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lote?: string;

  @ApiPropertyOptional({ example: "2026-05-30T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  validade?: string;

  @ApiPropertyOptional({ example: "Frio B2" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  localizacao?: string;

  @ApiPropertyOptional({ example: "BioStore" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fornecedor?: string;

  @ApiPropertyOptional({ example: "Manter refrigerado." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
