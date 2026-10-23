import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDonoDto {
  @ApiProperty({
    example: 'João Silva',
    description: 'Nome completo do dono/tutor do animal.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @ApiProperty({
    example: 'joao.silva@email.com',
    description: 'Email de contacto do dono.',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: '912345678',
    description: 'Telefone de contacto do dono.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;
}