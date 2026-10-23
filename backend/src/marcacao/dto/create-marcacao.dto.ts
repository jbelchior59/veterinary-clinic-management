import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMarcacaoDto {
  @ApiProperty({
    example: '2026-03-20T10:30:00.000Z',
    description: 'Data e hora da marcação.',
  })
  @IsDateString()
  data: string;

  @ApiProperty({
    example: 'Consulta de rotina',
    description: 'Motivo da marcação.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  motivo: string;

  @ApiProperty({
    example: 1,
    description: 'Identificador do animal associado à marcação.',
  })
  @IsInt()
  @IsPositive()
  animalId: number;

  @ApiProperty({
    example: 3,
    required: false,
    description: 'Profissional/veterinário associado à marcação.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  profissionalId?: number;
}