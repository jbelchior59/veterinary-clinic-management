import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/role.enum';
import { AnimalService } from './animal.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';

@ApiTags('Animais')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('animais')
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @ApiOperation({ summary: 'Criar animal' })
  @ApiResponse({ status: 201, description: 'Animal criado com sucesso' })
  @Post()
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  create(@Body() createAnimalDto: CreateAnimalDto) {
    return this.animalService.create(createAnimalDto);
  }

  @ApiOperation({ summary: 'Listar todos os animais' })
  @ApiResponse({ status: 200, description: 'Lista de animais devolvida com sucesso' })
  @Get()
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO, Role.TECNICO)
  findAll() {
    return this.animalService.findAll();
  }

  @ApiOperation({ summary: 'Obter histórico clínico do animal' })
  @ApiResponse({ status: 200, description: 'Histórico clínico devolvido com sucesso' })
  @Get(':id/historico')
  @Roles(Role.VETERINARIO)
  getHistorico(@Param('id', ParseIntPipe) id: number) {
    return this.animalService.getHistorico(id);
  }

  @ApiOperation({ summary: 'Obter animal por ID' })
  @ApiResponse({ status: 200, description: 'Animal encontrado' })
  @Get(':id')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO, Role.TECNICO)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.animalService.findOne(id);
  }

  @ApiOperation({ summary: 'Atualizar animal' })
  @ApiResponse({ status: 200, description: 'Animal atualizado com sucesso' })
  @Patch(':id')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAnimalDto: UpdateAnimalDto,
  ) {
    return this.animalService.update(id, updateAnimalDto);
  }

  @ApiOperation({ summary: 'Remover animal' })
  @ApiResponse({ status: 200, description: 'Animal removido com sucesso' })
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.animalService.remove(id);
  }
}