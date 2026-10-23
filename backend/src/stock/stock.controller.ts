import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/role.enum';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { CreateStockMovimentoDto } from './dto/create-stock-movimento.dto';
import { UpdateStockItemBodyDto } from './dto/update-stock-item-body.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @ApiOperation({ summary: 'Listar itens de stock com status' })
  @ApiResponse({
    status: 200,
    description: 'Lista de stock devolvida com sucesso',
  })
  @Get()
  @Roles(Role.ADMIN, Role.TECNICO)
  findAll() {
    return this.stockService.findAll();
  }

  @ApiOperation({
    summary: 'Listar alertas de stock baixo ou validade proxima',
  })
  @ApiResponse({
    status: 200,
    description: 'Alertas de stock devolvidos com sucesso',
  })
  @Get('alertas')
  @Roles(Role.ADMIN, Role.TECNICO, Role.RECECIONISTA)
  getAlertas() {
    return this.stockService.getAlertas();
  }

  @ApiOperation({ summary: 'Listar movimentos de um item de stock' })
  @ApiResponse({
    status: 200,
    description: 'Histórico de movimentos devolvido com sucesso',
  })
  @Get(':id/movimentos')
  @Roles(Role.ADMIN, Role.TECNICO)
  getMovimentos(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.getMovimentos(id);
  }

  @ApiOperation({ summary: 'Criar item de stock' })
  @ApiResponse({ status: 201, description: 'Item de stock criado com sucesso' })
  @Post()
  @Roles(Role.ADMIN, Role.TECNICO)
  create(@Body() dto: CreateStockItemDto) {
    return this.stockService.create(dto);
  }

  @ApiOperation({ summary: 'Atualizar item de stock' })
  @ApiResponse({
    status: 200,
    description: 'Item de stock atualizado com sucesso',
  })
  @Patch()
  @Roles(Role.ADMIN, Role.TECNICO)
  updateFromBody(@Body() dto: UpdateStockItemBodyDto) {
    const { id, ...data } = dto;
    return this.stockService.update(id, data);
  }

  @ApiOperation({ summary: 'Atualizar item de stock' })
  @ApiResponse({
    status: 200,
    description: 'Item de stock atualizado com sucesso',
  })
  @Patch(':id')
  @Roles(Role.ADMIN, Role.TECNICO)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockItemDto,
  ) {
    return this.stockService.update(id, dto);
  }

  @ApiOperation({ summary: 'Registar entrada de stock' })
  @ApiResponse({
    status: 201,
    description: 'Entrada de stock registada com sucesso',
  })
  @Post(':id/entrada')
  @Roles(Role.ADMIN, Role.TECNICO)
  addEntrada(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: CreateStockMovimentoDto,
  ) {
    return this.stockService.addEntrada(id, dto, user?.userId);
  }

  @ApiOperation({ summary: 'Registar consumo de stock' })
  @ApiResponse({
    status: 201,
    description: 'Consumo de stock registado com sucesso',
  })
  @Post(':id/consumo')
  @Roles(Role.ADMIN, Role.TECNICO)
  registarConsumo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: CreateStockMovimentoDto,
  ) {
    return this.stockService.registarConsumo(id, dto, user?.userId);
  }
}
