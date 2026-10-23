import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateServicoCatalogoDto {
  @ApiProperty({ example: 'Consulta Geral' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'CONSULTA' })
  @IsString()
  @IsNotEmpty()
  categoria: string;

  @ApiProperty({ example: 45.5 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  preco: number;

  @ApiPropertyOptional({ example: 'Consulta de rotina com veterinário' })
  @IsOptional()
  @IsString()
  descricao?: string;
}