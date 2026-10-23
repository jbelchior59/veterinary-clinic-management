import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, Matches } from 'class-validator';

export class CreateHorarioProfissionalDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ example: 1, description: '0=domingo, 6=sábado' })
  @IsInt()
  @Min(0)
  @Max(6)
  diaSemana: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaEntrada: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  horaSaida: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ example: 'ATIVO', enum: ['ATIVO', 'FOLGA', 'FERIAS', 'AUSENTE', 'EM_TREINO'] })
  @IsOptional()
  @IsIn(['ATIVO', 'FOLGA', 'FERIAS', 'AUSENTE', 'EM_TREINO'])
  estado?: string;

  @ApiPropertyOptional({ example: 'Consulta externa' })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
