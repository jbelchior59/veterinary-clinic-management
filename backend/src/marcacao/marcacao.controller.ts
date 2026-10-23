import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/role.enum';
import { MarcacaoService } from './marcacao.service';
import { CreateMarcacaoDto } from './dto/create-marcacao.dto';
import { UpdateMarcacaoDto } from './dto/update-marcacao.dto';

@ApiTags('Marcações')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marcacoes')
export class MarcacaoController {
  constructor(private readonly marcacaoService: MarcacaoService) {}

  @ApiOperation({ summary: 'Criar marcação' })
  @ApiResponse({ status: 201, description: 'Marcação criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou animal inexistente' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Post()
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  create(@Body() createMarcacaoDto: CreateMarcacaoDto) {
    return this.marcacaoService.create(createMarcacaoDto);
  }

  @ApiOperation({ summary: 'Listar marcações ativas' })
  @ApiResponse({ status: 200, description: 'Lista de marcações ativas' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Get()
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  findAllAtivas() {
    return this.marcacaoService.findAllAtivas();
  }

  @ApiOperation({ summary: 'Listar histórico de marcações' })
  @ApiResponse({ status: 200, description: 'Histórico completo de marcações' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Get('historico')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  findAllHistorico() {
    return this.marcacaoService.findAllHistorico();
  }

  @ApiOperation({ summary: 'Marcações de hoje (lista de espera)' })
  @ApiResponse({ status: 200, description: 'Marcações agendadas e confirmadas para hoje' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Get('hoje')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  findHoje() {
    return this.marcacaoService.findHoje();
  }

  @ApiOperation({ summary: 'Editar marcação' })
  @ApiResponse({ status: 200, description: 'Marcação atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Só é possível editar marcações agendadas' })
  @ApiResponse({ status: 404, description: 'Marcação não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Patch(':id')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateMarcacaoDto: UpdateMarcacaoDto) {
    return this.marcacaoService.update(id, updateMarcacaoDto);
  }

  @ApiOperation({ summary: 'Confirmar presença do paciente (check-in)' })
  @ApiResponse({ status: 200, description: 'Presença confirmada com sucesso' })
  @ApiResponse({ status: 400, description: 'Só é possível confirmar marcações agendadas' })
  @ApiResponse({ status: 404, description: 'Marcação não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Patch(':id/confirmar')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  confirmar(@Param('id', ParseIntPipe) id: number) {
    return this.marcacaoService.confirmar(id);
  }

  @ApiOperation({ summary: 'Cancelar marcação' })
  @ApiResponse({ status: 200, description: 'Marcação cancelada com sucesso' })
  @ApiResponse({ status: 400, description: 'Só é possível cancelar marcações agendadas' })
  @ApiResponse({ status: 404, description: 'Marcação não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Patch(':id/cancelar')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.marcacaoService.cancelar(id);
  }

  @ApiOperation({ summary: 'Concluir marcação' })
  @ApiResponse({ status: 200, description: 'Marcação concluída com sucesso' })
  @ApiResponse({ status: 400, description: 'Só é possível concluir marcações agendadas' })
  @ApiResponse({ status: 404, description: 'Marcação não encontrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @Patch(':id/concluir')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  concluir(@Param('id', ParseIntPipe) id: number) {
    return this.marcacaoService.concluir(id);
  }
}
