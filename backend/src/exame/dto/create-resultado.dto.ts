import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateResultadoDto {
  @ApiProperty({ example: 1, description: 'ID do exame associado ao resultado' })
  @IsInt()
  @Min(1)
  exameId: number;

  @ApiProperty({ example: 'Hemograma sem alterações significativas.' })
  @IsString()
  @MinLength(2)
  dados: string;

  @ApiPropertyOptional({ example: 'Leucócitos' })
  @IsOptional()
  @IsString()
  parametro?: string;

  @ApiPropertyOptional({ example: '12.5' })
  @IsOptional()
  @IsString()
  valor?: string;

  @ApiPropertyOptional({ example: '10^9/L' })
  @IsOptional()
  @IsString()
  unidade?: string;

  @ApiPropertyOptional({ example: '6.0 - 17.0' })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiPropertyOptional({ example: 'ALTO', enum: ['NORMAL', 'BAIXO', 'ALTO', 'CRITICO'] })
  @IsOptional()
  @IsString()
  interpretacao?: string;

  @ApiPropertyOptional({ example: 'Resultado compatível com quadro clínico.' })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
