import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateExameDto {
  @ApiProperty({ example: 1, description: 'ID do animal associado ao exame' })
  @IsInt()
  @Min(1)
  animalId: number;

  @ApiProperty({ example: 'Hemograma Completo', description: 'Tipo de exame' })
  @IsString()
  @MinLength(2)
  tipo: string;

  @ApiPropertyOptional({
    example: 'NORMAL',
    description: 'Prioridade do exame (ex.: NORMAL, ALTA)',
  })
  @IsOptional()
  @IsString()
  prioridade?: string;

  @ApiPropertyOptional({
    example: 'Exame solicitado após consulta por suspeita de infeção.',
    description: 'Descrição clínica associada ao pedido',
  })
  @IsOptional()
  @IsString()
  descricaoClinica?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Laboratório responsável, se aplicável',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  laboratorioId?: number;
}