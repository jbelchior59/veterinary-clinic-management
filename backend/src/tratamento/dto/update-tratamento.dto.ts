import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTratamentoDto } from './create-tratamento.dto';

export class UpdateTratamentoDto extends PartialType(
  OmitType(CreateTratamentoDto, ['consultaId'] as const),
) {}