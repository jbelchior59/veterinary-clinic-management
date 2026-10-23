import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateObservacaoInternamentoDto {
  @ApiProperty({ example: 'Animal alerta e responsivo. Sem vómitos nas últimas 6h.' })
  @IsString()
  @MinLength(2)
  observacoes: string;

  @ApiPropertyOptional({ example: 'T 38.4ºC, FC 92 bpm, FR 24 rpm' })
  @IsOptional()
  @IsString()
  sinaisVitais?: string;

  @ApiPropertyOptional({ example: 'Aceitou pequena refeição húmida.' })
  @IsOptional()
  @IsString()
  alimentacao?: string;

  @ApiPropertyOptional({ example: 'Analgesia administrada às 12h.' })
  @IsOptional()
  @IsString()
  medicacao?: string;

  @ApiPropertyOptional({ example: '2026-04-21T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  data?: string;
}
