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
import { DonoService } from './dono.service';
import { CreateDonoDto } from './dto/create-dono.dto';
import { UpdateDonoDto } from './dto/update-dono.dto';

@ApiTags('Donos')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('donos')
export class DonoController {
  constructor(private readonly donoService: DonoService) {}

  @ApiOperation({ summary: 'Criar dono' })
  @ApiResponse({ status: 201, description: 'Dono criado com sucesso' })
  @Post()
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  create(@Body() createDonoDto: CreateDonoDto) {
    return this.donoService.create(createDonoDto);
  }

  @ApiOperation({ summary: 'Listar donos' })
  @Get()
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO, Role.TECNICO)
  findAll() {
    return this.donoService.findAll();
  }

  @ApiOperation({ summary: 'Obter dono por ID' })
  @Get(':id')
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO, Role.TECNICO)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.donoService.findOne(id);
  }

  @ApiOperation({ summary: 'Atualizar dono' })
  @Patch(':id')
  @Roles(Role.ADMIN, Role.RECECIONISTA)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDonoDto: UpdateDonoDto,
  ) {
    return this.donoService.update(id, updateDonoDto);
  }

  @ApiOperation({ summary: 'Remover dono' })
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.donoService.remove(id);
  }
}