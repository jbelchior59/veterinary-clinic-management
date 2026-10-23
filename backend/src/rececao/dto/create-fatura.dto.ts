import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateFaturaLinhaDto {
  @ApiPropertyOptional({ example: 'Consulta veterinária' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.01)
  quantidade: number;

  @ApiProperty({ example: 45.5 })
  @IsNumber()
  @Min(0)
  precoUnit: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  servicoId?: number;
}

export class CreateFaturaDto {
  @ApiProperty({ example: 'FT-2026-0001' })
  @IsString()
  numero: string;

  @ApiProperty({ example: 45.5 })
  @IsNumber()
  @Min(0)
  valor: number;

  @ApiPropertyOptional({ example: 'Consulta geral' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ example: '2026-05-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dataVencimento?: string;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  animalId: number;

  @ApiPropertyOptional({ type: [CreateFaturaLinhaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFaturaLinhaDto)
  linhas?: CreateFaturaLinhaDto[];
}
