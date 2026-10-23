import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateConsumoDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'ID do item real de stock. Quando enviado, o stock é decrementado automaticamente.',
  })
  @IsOptional()
  @IsInt()
  stockItemId?: number;

  @ApiPropertyOptional({
    example: 'Tubo EDTA',
    description: 'Nome manual do item. Mantido para compatibilidade quando não há stockItemId.',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  item?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.01)
  quantidade: number;

  @ApiPropertyOptional({ example: 'un' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  unidade?: string;

  @ApiPropertyOptional({ example: 'EDTA-2409' })
  @IsOptional()
  @IsString()
  lote?: string;
}
