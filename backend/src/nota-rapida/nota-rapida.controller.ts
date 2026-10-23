import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotaRapidaService } from './nota-rapida.service';
import { CreateNotaRapidaDto } from './dto/create-nota-rapida.dto';

@ApiTags('Notas Rápidas')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notas-rapidas')
export class NotaRapidaController {
  constructor(private readonly notaRapidaService: NotaRapidaService) {}

  @ApiOperation({ summary: 'Criar nota rápida sobre um animal' })
  @ApiResponse({ status: 201, description: 'Nota criada com sucesso' })
  @Post()
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  create(@Body() dto: CreateNotaRapidaDto, @CurrentUser() user: any) {
    return this.notaRapidaService.create(dto, user?.userId);
  }

  @ApiOperation({ summary: 'Listar notas rápidas de um animal' })
  @ApiResponse({ status: 200, description: 'Lista de notas do animal' })
  @Get('animal/:animalId')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  findByAnimal(@Param('animalId', ParseIntPipe) animalId: number) {
    return this.notaRapidaService.findByAnimal(animalId);
  }

  @ApiOperation({ summary: 'Eliminar nota rápida' })
  @ApiResponse({ status: 200, description: 'Nota eliminada com sucesso' })
  @ApiResponse({ status: 404, description: 'Nota não encontrada' })
  @Delete(':id')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.notaRapidaService.remove(id, user?.userId, user?.role);
  }
}
