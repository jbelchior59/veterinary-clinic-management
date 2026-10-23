import { PartialType } from '@nestjs/mapped-types';
import { CreateExameDto } from './create-exame.dto';

export class UpdateExameDto extends PartialType(CreateExameDto) {}