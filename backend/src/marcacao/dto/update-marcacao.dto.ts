import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMarcacaoDto {
  @ApiPropertyOptional({
    example: '2026-03-20T10:30:00.000Z',
    description: 'Nova data e hora da marcação.',
  })
  @IsOptional()
  @IsDateString()
  data?: string;

  @ApiPropertyOptional({
    example: 'Vacinação',
    description: 'Novo motivo da marcação.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}
