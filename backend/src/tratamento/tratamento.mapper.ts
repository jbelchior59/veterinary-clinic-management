import { Tratamento, Consulta } from '@prisma/client';
import { TratamentoResponseDto } from './dto/tratamento-response.dto';

type TratamentoComConsulta = Tratamento & { consulta: Consulta };

export class TratamentoMapper {
  static toResponse(entity: TratamentoComConsulta): TratamentoResponseDto {
    return {
      id: entity.id,
      descricao: entity.descricao,
      medicacao: entity.medicacao ?? null,
      consultaId: entity.consultaId,
      dataConsulta: entity.consulta.data,
      createdAt: entity.createdAt,
    };
  }
}