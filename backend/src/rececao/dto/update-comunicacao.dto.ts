import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateComunicacaoDto {
  @ApiPropertyOptional({ example: 'LEMBRETE' })
  @IsOptional()
  @IsIn(['CHAMADA', 'PEDIDO', 'LEMBRETE', 'NOTA'])
  tipo?: string;

  @ApiPropertyOptional({ example: 'SMS' })
  @IsOptional()
  @IsIn(['TELEFONE', 'SMS', 'EMAIL', 'PRESENCIAL'])
  canal?: string;

  @ApiPropertyOptional({ example: 'Confirmação de consulta' })
  @IsOptional()
  @IsString()
  assunto?: string;

  @ApiPropertyOptional({ example: 'Ligar para confirmar a presença' })
  @IsOptional()
  @IsString()
  mensagem?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  animalId?: number | null;
}
