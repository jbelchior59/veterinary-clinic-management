import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConsultaService } from './consulta.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/role.enum';

@ApiTags('Consultas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consultas')
export class ConsultaController {
  constructor(private readonly consultaService: ConsultaService) {}

  @Post()
  @Roles(Role.VETERINARIO)
  @ApiOperation({
    summary: 'Registar nova consulta',
    description: 'Cria uma nova consulta associada a um animal existente.',
  })
  @ApiBody({ type: CreateConsultaDto })
  @ApiCreatedResponse({ description: 'Consulta registada com sucesso.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou animal inexistente.' })
  @ApiNotFoundResponse({
    description:
      'Animal não encontrado. O animalId fornecido não corresponde a nenhum animal existente.',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissões para registar consultas.' })
  create(@Body() createConsultaDto: CreateConsultaDto, @CurrentUser() user: any) {
    const veterinarioId = Number(user?.userId ?? user?.id ?? user?.sub);

    if (!veterinarioId || Number.isNaN(veterinarioId)) {
      throw new UnauthorizedException('Utilizador autenticado inválido.');
    }

    return this.consultaService.create(createConsultaDto, veterinarioId);
  }

  @Get('animal/:animalId')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  @ApiOperation({
    summary: 'Listar consultas de um animal',
    description:
      'Devolve todas as consultas associadas a um animal. Inclui tratamentos e veterinário responsável.',
  })
  @ApiParam({ name: 'animalId', type: Number, description: 'ID do animal.', example: 1 })
  @ApiOkResponse({ description: 'Lista de consultas devolvida com sucesso.' })
  @ApiNotFoundResponse({ description: 'Animal não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissões para consultar este recurso.' })
  findByAnimal(@Param('animalId', ParseIntPipe) animalId: number) {
    return this.consultaService.findByAnimal(animalId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  @ApiOperation({ summary: 'Obter consulta por ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da consulta.', example: 1 })
  @ApiOkResponse({ description: 'Consulta devolvida com sucesso.' })
  @ApiNotFoundResponse({ description: 'Consulta não encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Não autenticado.' })
  @ApiForbiddenResponse({ description: 'Sem permissões para consultar este recurso.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.consultaService.findOne(id);
  }
}
