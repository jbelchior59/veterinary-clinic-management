import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAmostraDto {
  @ApiProperty({ example: 1, description: 'ID do exame associado à amostra' })
  @IsInt()
  @Min(1)
  exameId: number;

  @ApiProperty({ example: 'AMO-2026-001', description: 'Código interno da amostra' })
  @IsString()
  @MinLength(2)
  codigo: string;

  @ApiProperty({ example: 'Sangue', description: 'Tipo da amostra' })
  @IsString()
  @MinLength(2)
  tipo: string;

  @ApiPropertyOptional({ example: 'INTERNA', description: 'Origem da amostra' })
  @IsOptional()
  @IsString()
  origem?: string;

  @ApiPropertyOptional({ example: '2-8 C', description: 'Temperatura de conservacao' })
  @IsOptional()
  @IsString()
  temperatura?: string;

  @ApiPropertyOptional({ example: 'Frigorifico B2', description: 'Localizacao da amostra no laboratorio' })
  @IsOptional()
  @IsString()
  localizacaoArmazenamento?: string;

  @ApiPropertyOptional({ example: 'Amostra recolhida sem incidentes.' })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
