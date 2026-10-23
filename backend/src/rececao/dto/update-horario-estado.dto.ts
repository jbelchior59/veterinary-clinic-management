import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateHorarioEstadoDto {
  @ApiProperty({ example: 'ATIVO', enum: ['ATIVO', 'FOLGA', 'FERIAS', 'AUSENTE', 'EM_TREINO'] })
  @IsIn(['ATIVO', 'FOLGA', 'FERIAS', 'AUSENTE', 'EM_TREINO'])
  estado: string;
}
