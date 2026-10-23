import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRelatorioDto {
  @ApiProperty({ example: 1, description: 'ID do exame associado ao relatório' })
  @IsInt()
  @Min(1)
  exameId: number;

  @ApiProperty({ example: 'Resultados compatíveis com recuperação clínica favorável.' })
  @IsString()
  @MinLength(2)
  conclusao: string;

  @ApiPropertyOptional({ example: 'Sem alterações adicionais relevantes.' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ example: 'Manter vigilância e repetir avaliação em 15 dias se necessário.' })
  @IsOptional()
  @IsString()
  recomendacoes?: string;
}
