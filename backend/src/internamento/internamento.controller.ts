import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/role.enum';
import { InternamentoService } from './internamento.service';
import { CreateInternamentoDto } from './dto/create-internamento.dto';
import { CreateObservacaoInternamentoDto } from './dto/create-observacao-internamento.dto';
import { AltaInternamentoDto } from './dto/alta-internamento.dto';

function getUserId(req: any) {
  const userId = Number(req.user?.sub ?? req.user?.userId ?? req.user?.id);

  if (!userId || Number.isNaN(userId)) {
    throw new UnauthorizedException('Utilizador autenticado inválido.');
  }

  return userId;
}

@ApiTags('Internamentos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('internamentos')
export class InternamentoController {
  constructor(private readonly internamentoService: InternamentoService) {}

  @ApiOperation({ summary: 'Criar internamento' })
  @ApiResponse({ status: 201, description: 'Internamento criado com sucesso' })
  @Post()
  @Roles(Role.ADMIN, Role.VETERINARIO)
  create(@Body() dto: CreateInternamentoDto, @Req() req: any) {
    return this.internamentoService.create(dto, getUserId(req));
  }

  @ApiOperation({ summary: 'Listar internamentos' })
  @ApiResponse({ status: 200, description: 'Lista de internamentos' })
  @Get()
  @Roles(Role.VETERINARIO, Role.ADMIN)
  findAll() {
    return this.internamentoService.findAll();
  }

  @ApiOperation({ summary: 'Listar internamentos ativos' })
  @ApiResponse({ status: 200, description: 'Lista de internamentos ativos' })
  @Get('ativos')
  @Roles(Role.VETERINARIO, Role.ADMIN)
  findAtivos() {
    return this.internamentoService.findAtivos();
  }

  @ApiOperation({ summary: 'Obter internamento por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes do internamento' })
  @Get(':id')
  @Roles(Role.VETERINARIO, Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.internamentoService.findOne(id);
  }

  @ApiOperation({ summary: 'Adicionar observação de monitorização' })
  @ApiResponse({ status: 201, description: 'Observação registada com sucesso' })
  @Post(':id/observacoes')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  addObservacao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateObservacaoInternamentoDto,
    @Req() req: any,
  ) {
    return this.internamentoService.addObservacao(id, dto, getUserId(req));
  }

  @ApiOperation({ summary: 'Dar alta a internamento' })
  @ApiResponse({ status: 200, description: 'Alta registada com sucesso' })
  @Patch(':id/alta')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  darAlta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AltaInternamentoDto,
  ) {
    return this.internamentoService.darAlta(id, dto);
  }
}
