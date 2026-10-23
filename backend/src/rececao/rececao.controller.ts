import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/role.enum';
import { RececaoService } from './rececao.service';
import { CreateComunicacaoDto } from './dto/create-comunicacao.dto';
import { CreateFaturaDto } from './dto/create-fatura.dto';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { CreateHorarioProfissionalDto } from './dto/create-horario-profissional.dto';
import { UpdateComunicacaoDto } from './dto/update-comunicacao.dto';
import { UpdateHorarioEstadoDto } from './dto/update-horario-estado.dto';
import { CreateServicoCatalogoDto } from './dto/create-servico-catalogo.dto';
import { UpdateServicoCatalogoDto } from './dto/update-servico-catalogo.dto';

@ApiTags('Receção')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rececao')
export class RececaoController {
  constructor(private readonly rececaoService: RececaoService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  dashboard() {
    return this.rececaoService.dashboard();
  }

  @Get('dashboard/tecnico')
  @Roles(Role.ADMIN, Role.TECNICO)
  dashboardTecnico() {
    return this.rececaoService.dashboardTecnico();
  }

  @Get('dashboard/veterinario')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  dashboardVeterinario() {
    return this.rececaoService.dashboardVeterinario();
  }

  @Get('stats/monthly')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  getMonthlyStats() {
    return this.rececaoService.getMonthlyStats();
  }

  @Get('agenda')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  agenda(@Query('modo') modo?: string, @Query('data') data?: string) {
    return this.rececaoService.agenda(modo, data);
  }

  @Get('alertas')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  alertas() {
    return this.rececaoService.alertas();
  }

  @Get('profissionais/disponiveis')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  profissionaisDisponiveis(@Query('data') data?: string) {
    return this.rececaoService.profissionaisDisponiveis(data);
  }

  @Get('profissionais')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  profissionais() {
    return this.rececaoService.profissionais();
  }

  @Post('comunicacoes')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  createComunicacao(
    @CurrentUser() user: any,
    @Body() dto: CreateComunicacaoDto,
  ) {
    return this.rececaoService.createComunicacao(dto, user?.userId);
  }

  @Patch('comunicacoes/:id')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  updateComunicacao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComunicacaoDto,
  ) {
    return this.rececaoService.updateComunicacao(id, dto);
  }

  @Delete('comunicacoes/:id')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  deleteComunicacao(@Param('id', ParseIntPipe) id: number) {
    return this.rececaoService.deleteComunicacao(id);
  }

  @Get('comunicacoes')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  listarComunicacoes() {
    return this.rececaoService.listarComunicacoes();
  }

  @Post('faturas')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  createFatura(@CurrentUser() user: any, @Body() dto: CreateFaturaDto) {
    return this.rececaoService.createFatura(dto, user?.userId);
  }

  @Get('faturas/pendentes')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  faturasPendentes() {
    return this.rececaoService.faturasPendentes();
  }

  @Get('faturas')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  faturasTodas() {
    return this.rececaoService.faturasTodas();
  }

  @Get('faturas/:id')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  getFatura(@Param('id', ParseIntPipe) id: number) {
    return this.rececaoService.getFaturaDetalhada(id);
  }

  @Post('faturas/:id/pagamentos')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  registarPagamento(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: CreatePagamentoDto,
  ) {
    return this.rececaoService.registarPagamento(id, dto, user?.userId);
  }

  @Post('horarios')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  criarHorario(
    @CurrentUser() user: any,
    @Body() dto: CreateHorarioProfissionalDto,
  ) {
    return this.rececaoService.criarHorario(dto, user?.userId);
  }

  @Patch('horarios/:id/estado')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  atualizarHorarioEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHorarioEstadoDto,
  ) {
    return this.rececaoService.updateHorarioEstado(id, dto);
  }

  @Get('horarios')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  horarios() {
    return this.rececaoService.horarios();
  }

  // ─── Catálogo de Serviços ──────────────────────────────────────────────────

  @Get('servicos')
  @ApiOperation({ summary: 'Lista serviços ativos do catálogo' })
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  getServicos() {
    return this.rececaoService.findServicosAtivos();
  }

  @Get('servicos/catalogo')
  @ApiOperation({ summary: 'Lista todos os serviços do catálogo (só ADMIN)' })
  @Roles(Role.ADMIN)
  findServicosCatalogo() {
    return this.rececaoService.findServicosCatalogo();
  }

  @Post('servicos')
  @ApiOperation({ summary: 'Cria um novo serviço no catálogo (só ADMIN)' })
  @Roles(Role.ADMIN)
  createServico(@Body() dto: CreateServicoCatalogoDto) {
    return this.rececaoService.createServico(dto);
  }

  @Patch('servicos/:id')
  @ApiOperation({ summary: 'Atualiza um serviço do catálogo (só ADMIN)' })
  @Roles(Role.ADMIN)
  updateServico(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServicoCatalogoDto,
  ) {
    return this.rececaoService.updateServico(id, dto);
  }

  @Patch('servicos/:id/toggle')
  @ApiOperation({ summary: 'Ativa/desativa um serviço do catálogo (só ADMIN)' })
  @Roles(Role.ADMIN)
  toggleServico(@Param('id', ParseIntPipe) id: number) {
    return this.rececaoService.toggleServico(id);
  }
}
