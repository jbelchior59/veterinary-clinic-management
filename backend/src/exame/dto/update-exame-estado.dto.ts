import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateExameEstadoDto {
  @ApiProperty({
    example: 'EM_ANALISE',
    enum: ['PENDENTE', 'SOLICITADO', 'AMOSTRA_COLETADA', 'AMOSTRA_REJEITADA', 'AGUARDA_NOVA_AMOSTRA', 'EM_ANALISE', 'CONCLUIDO', 'VALIDADO', 'CANCELADO'],
  })
  @IsIn(['PENDENTE', 'SOLICITADO', 'AMOSTRA_COLETADA', 'AMOSTRA_REJEITADA', 'AGUARDA_NOVA_AMOSTRA', 'EM_ANALISE', 'CONCLUIDO', 'VALIDADO', 'CANCELADO'])
  estado: string;
}
