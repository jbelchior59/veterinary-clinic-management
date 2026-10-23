import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateComunicacaoDto {
  @ApiProperty({ example: 'LEMBRETE' })
  @IsIn(['CHAMADA', 'PEDIDO', 'LEMBRETE', 'NOTA'])
  tipo: string;

  @ApiProperty({ example: 'SMS' })
  @IsIn(['TELEFONE', 'SMS', 'EMAIL', 'PRESENCIAL'])
  canal: string;

  @ApiPropertyOptional({ example: 'Confirmação de consulta' })
  @IsOptional()
  @IsString()
  assunto?: string;

  @ApiProperty({ example: 'Ligar para confirmar a presença' })
  @IsString()
  @IsNotEmpty()
  mensagem: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  animalId?: number;
}
