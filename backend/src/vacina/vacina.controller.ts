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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VacinaService } from './vacina.service';
import { CreateVacinaDto } from './dto/create-vacina.dto';
import { UpdateVacinaDto } from './dto/update-vacina.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../auth/role.enum';

@ApiTags('Vacinas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class VacinaController {
  constructor(private readonly vacinaService: VacinaService) {}

  @Post('animais/:animalId/vacinas')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  @ApiOperation({ summary: 'Registar vacina para um animal' })
  @ApiParam({ name: 'animalId', type: Number })
  create(
    @Param('animalId', ParseIntPipe) animalId: number,
    @Body() dto: CreateVacinaDto,
    @CurrentUser() user: any,
  ) {
    const aplicadoPorId = Number(user?.userId ?? user?.id ?? user?.sub);
    if (!aplicadoPorId || Number.isNaN(aplicadoPorId)) {
      throw new UnauthorizedException('Utilizador autenticado inválido.');
    }
    return this.vacinaService.create({ ...dto, animalId }, aplicadoPorId);
  }

  @Get('animais/:animalId/vacinas')
  @Roles(Role.ADMIN, Role.VETERINARIO, Role.RECECIONISTA)
  @ApiOperation({ summary: 'Listar vacinas de um animal' })
  @ApiParam({ name: 'animalId', type: Number })
  findByAnimal(@Param('animalId', ParseIntPipe) animalId: number) {
    return this.vacinaService.findByAnimal(animalId);
  }

  @Get('vacinas/alertas')
  @Roles(Role.ADMIN, Role.VETERINARIO, Role.RECECIONISTA)
  @ApiOperation({ summary: 'Vacinas com próxima dose nos próximos N dias' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  findAlertas(@Query('days') days?: string) {
    return this.vacinaService.findAlertasProximasDoses(days ? Number(days) : 30);
  }

  @Patch('vacinas/:id')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  @ApiOperation({ summary: 'Atualizar registo de vacina' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVacinaDto) {
    return this.vacinaService.update(id, dto);
  }

  @Delete('vacinas/:id')
  @Roles(Role.ADMIN, Role.VETERINARIO)
  @ApiOperation({ summary: 'Eliminar registo de vacina' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vacinaService.remove(id);
  }
}
