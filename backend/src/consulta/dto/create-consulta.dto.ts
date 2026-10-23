import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateConsultaDto {
  @ApiProperty({
    example: '2026-03-21T10:30:00.000Z',
    description: 'Data e hora da consulta.',
  })
  @IsDateString()
  data: string;

  @ApiProperty({
    example: 'Animal apresenta febre e perda de apetite.',
    description: 'Observações registadas durante a consulta.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  observacoes: string;

  @ApiProperty({
    example: 'Possível infeção gastrointestinal.',
    description: 'Diagnóstico clínico associado à consulta.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  diagnostico: string;

  @ApiProperty({
    example: 1,
    description: 'Identificador do animal associado à consulta.',
  })
  @IsInt()
  @IsPositive()
  animalId: number;

  @IsOptional()
  @IsNumber()
  pesoRegistado?: number;
}