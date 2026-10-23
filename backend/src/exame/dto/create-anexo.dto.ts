import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAnexoDto {
  @ApiProperty({ example: 'Citologia - lamina 1.jpg' })
  @IsString()
  @MinLength(2)
  nome: string;

  @ApiProperty({ example: 'https://exemplo.local/anexos/citologia-1.jpg' })
  @IsString()
  @MinLength(3)
  url: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  tipo?: string;
}
