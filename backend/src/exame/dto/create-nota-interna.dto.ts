import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateNotaInternaDto {
  @ApiProperty({ example: 'Amostra repetida por suspeita de hemolise.' })
  @IsString()
  @MinLength(3)
  conteudo: string;
}
