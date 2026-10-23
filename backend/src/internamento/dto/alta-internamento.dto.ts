import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AltaInternamentoDto {
  @ApiPropertyOptional({ example: 'Alta clínica com melhoria significativa.' })
  @IsOptional()
  @IsString()
  observacoesAlta?: string;

  @ApiPropertyOptional({ example: '2026-04-22T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dataAlta?: string;
}
