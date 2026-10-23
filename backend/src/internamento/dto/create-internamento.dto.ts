import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateInternamentoDto {
  @ApiProperty({ example: 1, description: 'ID do animal a internar' })
  @IsInt()
  @Min(1)
  animalId: number;

  @ApiProperty({ example: 'Observação após cirurgia' })
  @IsString()
  @MinLength(2)
  motivo: string;

  @ApiPropertyOptional({ example: 'Animal estável, manter vigilância durante 24h.' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ example: '2026-04-21T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dataEntrada?: string;
}
