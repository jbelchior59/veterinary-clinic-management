import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePagamentoDto {
  @ApiProperty({ example: 45.5 })
  @IsNumber()
  @Min(0)
  valor: number;

  @ApiProperty({ example: 'MULTIBANCO', enum: ['MULTIBANCO', 'CARTAO', 'TRANSFERENCIA', 'DINHEIRO', 'CHEQUE'] })
  @IsIn(['MULTIBANCO', 'CARTAO', 'TRANSFERENCIA', 'DINHEIRO', 'CHEQUE'])
  metodo: string;

  @ApiPropertyOptional({ example: 'MB 1234 5678 9012' })
  @IsOptional()
  @IsString()
  referencia?: string;
}
