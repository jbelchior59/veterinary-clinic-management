import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateAnimalDto {
  @ApiProperty({ example: 'Rex', description: 'Nome do animal.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nome: string;

  @ApiProperty({ example: 'Cão', description: 'Espécie do animal.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  especie: string;

  @ApiProperty({ example: 1, description: 'Identificador do dono associado ao animal.' })
  @IsInt()
  @IsPositive()
  donoId: number;

  @ApiPropertyOptional({ example: 'Labrador', description: 'Raça do animal.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  raca?: string;

  @ApiPropertyOptional({ example: 'M', description: 'Género do animal (M ou F).' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  genero?: string;

  @ApiPropertyOptional({ example: '2020-05-10', description: 'Data de nascimento (ISO 8601).' })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiPropertyOptional({ example: 24.5, description: 'Peso em kg.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number;
}