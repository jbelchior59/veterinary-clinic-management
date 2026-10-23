import { IsString, IsOptional, IsInt, IsNotEmpty, IsPositive, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTratamentoDto {
  @ApiProperty({ example: 'Aplicação de anti-inflamatório', description: 'Descrição do tratamento realizado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  descricao: string;

  @ApiPropertyOptional({ nullable: true, example: 'Meloxicam 0,5 mg/kg', description: 'Medicação administrada (opcional)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  medicacao?: string;

  @ApiProperty({ example: 1, description: 'ID da consulta à qual o tratamento é associado' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  consultaId: number;
}