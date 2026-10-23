import { ApiProperty } from '@nestjs/swagger';

export class TratamentoResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Aplicação de anti-inflamatório' })
  descricao: string;

  @ApiProperty({ required: false, nullable: true, example: 'Meloxicam 0,5 mg/kg' })
  medicacao?: string | null;

  @ApiProperty({ example: 3 })
  consultaId: number;

  @ApiProperty({ example: '2026-03-25T10:00:00.000Z' })
  dataConsulta: Date;

  @ApiProperty({ example: '2026-03-25T11:30:00.000Z' })
  createdAt: Date;
}