import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectAmostraDto {
  @ApiProperty({ example: 'Volume insuficiente para processamento.' })
  @IsString()
  @MinLength(3)
  motivo: string;
}
