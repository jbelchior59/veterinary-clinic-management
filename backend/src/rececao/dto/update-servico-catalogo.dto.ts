import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServicoCatalogoDto } from './create-servico-catalogo.dto';

export class UpdateServicoCatalogoDto extends PartialType(
  CreateServicoCatalogoDto,
) {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}