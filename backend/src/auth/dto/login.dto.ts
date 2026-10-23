import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@les.local',
    description: 'Email do utilizador',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    example: 'admin123',
    description: 'Password do utilizador',
  })
  @IsString()
  @MinLength(3, { message: 'A password deve ter pelo menos 3 caracteres' })
  password: string;
}