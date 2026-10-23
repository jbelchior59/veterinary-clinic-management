import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateNotaRapidaDto {
  @ApiProperty({ example: 'Ligar para confirmar consulta amanhã', description: 'Texto da nota rápida.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  texto: string;

  @ApiProperty({ example: 1, description: 'ID do animal associado.' })
  @IsInt()
  @IsPositive()
  animalId: number;
}
