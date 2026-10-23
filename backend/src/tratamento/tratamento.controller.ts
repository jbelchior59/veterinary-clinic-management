import {
  Body,
  Controller,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { TratamentoService } from './tratamento.service';
import { CreateTratamentoDto } from './dto/create-tratamento.dto';
import { UpdateTratamentoDto } from './dto/update-tratamento.dto';
import { TratamentoResponseDto } from './dto/tratamento-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/role.enum';

@ApiTags('Tratamentos')
@ApiBearerAuth('JWT-auth')
@Controller('tratamentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TratamentoController {
  constructor(private readonly tratamentoService: TratamentoService) {}

  @Post()
  @Roles(Role.VETERINARIO)
  @ApiOperation({
    summary: 'Registar tratamento',
    description: 'Cria um novo tratamento associado a uma consulta existente. Apenas utilizadores com role ADMIN, VETERINARIO ou TECNICO podem criar tratamentos.',
  })
  @ApiBody({ type: CreateTratamentoDto })
  @ApiCreatedResponse({ description: 'Tratamento criado com sucesso.', type: TratamentoResponseDto })
  @ApiBadRequestResponse({ description: 'Payload inválido (campos obrigatórios em falta ou tipo errado).' })
  @ApiUnauthorizedResponse({ description: 'Token JWT em falta ou inválido.' })
  @ApiForbiddenResponse({ description: 'Utilizador sem permissão para criar tratamentos.' })
  @ApiNotFoundResponse({ description: 'Consulta não encontrada.' })
  create(@Body() createTratamentoDto: CreateTratamentoDto): Promise<TratamentoResponseDto> {
    return this.tratamentoService.create(createTratamentoDto);
  }

  @Patch(':id')
  @Roles(Role.VETERINARIO)
  @ApiOperation({
    summary: 'Editar tratamento',
    description: 'Atualiza parcialmente um tratamento existente. Apenas utilizadores com role ADMIN, VETERINARIO ou TECNICO podem editar tratamentos.',
  })
  @ApiBody({ type: UpdateTratamentoDto })
  @ApiOkResponse({ description: 'Tratamento atualizado com sucesso.', type: TratamentoResponseDto })
  @ApiBadRequestResponse({ description: 'Payload inválido.' })
  @ApiUnauthorizedResponse({ description: 'Token JWT em falta ou inválido.' })
  @ApiForbiddenResponse({ description: 'Utilizador sem permissão para editar tratamentos.' })
  @ApiNotFoundResponse({ description: 'Tratamento não encontrado.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTratamentoDto: UpdateTratamentoDto,
  ): Promise<TratamentoResponseDto> {
    return this.tratamentoService.update(id, updateTratamentoDto);
  }
}