import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateUserPasswordDto {
  @ApiProperty({ example: 'NovaPasse123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
