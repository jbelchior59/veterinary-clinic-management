import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({ example: 'CREATE', description: 'Ação realizada' })
  @IsString()
  @IsNotEmpty()
  acao: string;

  @ApiProperty({ example: 'Marcacao', description: 'Entidade afetada' })
  @IsString()
  @IsNotEmpty()
  entidade: string;

  @ApiPropertyOptional({ example: 5, description: 'ID da entidade afetada' })
  @IsOptional()
  @IsInt()
  entidadeId?: number;

  @ApiPropertyOptional({ example: 'Marcação criada pelo rececionista', description: 'Detalhes adicionais' })
  @IsOptional()
  @IsString()
  detalhes?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID do utilizador que realizou a ação' })
  @IsOptional()
  @IsInt()
  userId?: number;
}
