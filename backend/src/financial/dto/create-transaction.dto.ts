import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({ example: 'LUCRO', enum: ['LUCRO', 'DESPESA'] })
  @IsIn(['LUCRO', 'DESPESA'])
  tipo: 'LUCRO' | 'DESPESA';

  @ApiProperty({ example: 'Consultas' })
  @IsString()
  @IsNotEmpty()
  categoria: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  @Min(0)
  valor: number;

  @ApiPropertyOptional({ example: 'Consulta de rotina — Bobi' })
  @IsOptional()
  @IsString()
  descricao?: string;
}
