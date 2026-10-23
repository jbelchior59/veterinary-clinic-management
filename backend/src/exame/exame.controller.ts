import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/role.enum';
import { ExameService } from './exame.service';
import { CreateExameDto } from './dto/create-exame.dto';
import { CreateAmostraDto } from './dto/create-amostra.dto';
import { CreateResultadoDto } from './dto/create-resultado.dto';
import { CreateRelatorioDto } from './dto/create-relatorio.dto';
import { UpdateExameEstadoDto } from './dto/update-exame-estado.dto';
import { RejectAmostraDto } from './dto/reject-amostra.dto';
import { CreateNotaInternaDto } from './dto/create-nota-interna.dto';
import { CreateAnexoDto } from './dto/create-anexo.dto';
import { CreateConsumoDto } from './dto/create-consumo.dto';

const { diskStorage } = require('multer');
const examesUploadDir = join(process.cwd(), 'uploads', 'exames');
const allowedAnexoMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);

mkdirSync(examesUploadDir, { recursive: true });

function getUserId(req: any) {
  const userId = Number(req.user?.sub ?? req.user?.userId ?? req.user?.id);

  if (!userId || Number.isNaN(userId)) {
    throw new UnauthorizedException('Utilizador autenticado inválido.');
  }

  return userId;
}

@ApiTags('Exames')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exames')
export class ExameController {
  constructor(private readonly exameService: ExameService) {}

  @ApiOperation({ summary: 'Criar pedido de exame' })
  @ApiResponse({ status: 201, description: 'Exame criado com sucesso' })
  @Post()
  @Roles(Role.VETERINARIO)
  create(@Body() createExameDto: CreateExameDto, @Req() req: any) {
    return this.exameService.create(createExameDto, getUserId(req));
  }

  @ApiOperation({ summary: 'Listar exames' })
  @ApiResponse({ status: 200, description: 'Lista de exames' })
  @Get()
  @Roles(Role.ADMIN, Role.VETERINARIO, Role.TECNICO)
  findAll() {
    return this.exameService.findAll();
  }

  @ApiOperation({ summary: 'Listar templates de resultados por tipo de exame' })
  @ApiResponse({ status: 200, description: 'Templates de parametros laboratoriais' })
  @Get('templates/resultados')
  @Roles(Role.ADMIN, Role.VETERINARIO, Role.TECNICO)
  getTemplates() {
    return this.exameService.getResultadoTemplates();
  }

  @ApiOperation({ summary: 'Listar exames por animal' })
  @ApiResponse({ status: 200, description: 'Lista de exames do animal' })
  @Get('animal/:animalId')
  @Roles(Role.ADMIN, Role.VETERINARIO, Role.TECNICO)
  findByAnimal(@Param('animalId', ParseIntPipe) animalId: number) {
    return this.exameService.findByAnimal(animalId);
  }

  @ApiOperation({ summary: 'Obter exame por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes do exame' })
  @Get(':id')
  @Roles(Role.ADMIN, Role.VETERINARIO, Role.TECNICO)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exameService.findOne(id);
  }

  @ApiOperation({ summary: 'Atualizar estado do exame' })
  @ApiResponse({ status: 200, description: 'Estado atualizado com sucesso' })
  @Patch(':id/estado')
  @Roles(Role.TECNICO, Role.VETERINARIO)
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExameEstadoDto,
    @Req() req: any,
  ) {
    return this.exameService.updateEstado(id, dto.estado, req.user?.role, getUserId(req));
  }

  @ApiOperation({ summary: 'Adicionar nota interna de laboratorio' })
  @ApiResponse({ status: 201, description: 'Nota registada com sucesso' })
  @Post(':id/notas-internas')
  @Roles(Role.TECNICO, Role.VETERINARIO)
  createNotaInterna(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNotaInternaDto,
    @Req() req: any,
  ) {
    return this.exameService.createNotaInterna(id, dto, getUserId(req));
  }

  @ApiOperation({ summary: 'Adicionar anexo laboratorial' })
  @ApiResponse({ status: 201, description: 'Anexo registado com sucesso' })
  @Post(':id/anexos')
  @Roles(Role.TECNICO, Role.VETERINARIO)
  createAnexo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAnexoDto,
    @Req() req: any,
  ) {
    return this.exameService.createAnexo(id, dto, getUserId(req));
  }

  @ApiOperation({ summary: 'Fazer upload de anexo laboratorial' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Ficheiro guardado e anexo registado com sucesso' })
  @Post(':id/anexos/upload')
  @Roles(Role.TECNICO, Role.VETERINARIO)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: examesUploadDir,
        filename: (_req: any, file: any, callback: (error: Error | null, filename: string) => void) => {
          callback(null, `${Date.now()}-${file.originalname}`);
        },
      }),
      fileFilter: (_req: any, file: any, callback: (error: Error | null, acceptFile: boolean) => void) => {
        if (!allowedAnexoMimeTypes.has(file.mimetype)) {
          return callback(
            new BadRequestException('Tipo de ficheiro invalido. Apenas PDF, PNG e JPG sao aceites.'),
            false,
          );
        }

        return callback(null, true);
      },
    }),
  )
  uploadAnexo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Ficheiro obrigatorio.');
    }

    return this.exameService.addAnexo(
      id,
      {
        nome: file.originalname,
        url: `/uploads/exames/${file.filename}`,
        tipo: file.mimetype,
      },
      getUserId(req),
    );
  }

  @ApiOperation({ summary: 'Registar consumo de stock no exame' })
  @ApiResponse({ status: 201, description: 'Consumo registado com sucesso' })
  @Post(':id/consumos')
  @Roles(Role.TECNICO)
  createConsumo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateConsumoDto,
    @Req() req: any,
  ) {
    return this.exameService.createConsumo(id, dto, getUserId(req));
  }
}

@ApiTags('Amostras')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('amostras')
export class AmostraController {
  constructor(private readonly exameService: ExameService) {}

  @ApiOperation({ summary: 'Registar amostra de um exame' })
  @ApiResponse({ status: 201, description: 'Amostra registada com sucesso' })
  @Post()
  @Roles(Role.TECNICO)
  create(@Body() dto: CreateAmostraDto, @Req() req: any) {
    return this.exameService.createAmostra(dto, getUserId(req));
  }

  @ApiOperation({ summary: 'Rejeitar amostra de um exame' })
  @ApiResponse({ status: 200, description: 'Amostra rejeitada com sucesso' })
  @Patch(':id/rejeitar')
  @Roles(Role.TECNICO)
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectAmostraDto,
    @Req() req: any,
  ) {
    return this.exameService.rejeitarAmostra(id, dto, getUserId(req));
  }
}

@ApiTags('Resultados')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('resultados')
export class ResultadoController {
  constructor(private readonly exameService: ExameService) {}

  @ApiOperation({ summary: 'Inserir resultado laboratorial' })
  @ApiResponse({ status: 201, description: 'Resultado inserido com sucesso' })
  @Post()
  @Roles(Role.TECNICO)
  create(@Body() dto: CreateResultadoDto, @Req() req: any) {
    return this.exameService.createResultado(dto, getUserId(req));
  }

  @ApiOperation({ summary: 'Listar resultados de um exame' })
  @ApiResponse({ status: 200, description: 'Resultados do exame' })
  @Get('exame/:exameId')
  @Roles(Role.ADMIN, Role.VETERINARIO, Role.TECNICO)
  findByExame(@Param('exameId', ParseIntPipe) exameId: number) {
    return this.exameService.findResultadosByExame(exameId);
  }

  @ApiOperation({ summary: 'Validar resultado laboratorial' })
  @ApiResponse({ status: 200, description: 'Resultado validado com sucesso' })
  @Patch(':id/validar')
  @Roles(Role.VETERINARIO)
  validar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.exameService.validarResultado(id, getUserId(req));
  }
}

@ApiTags('Relatórios')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('relatorios')
export class RelatorioController {
  constructor(private readonly exameService: ExameService) {}

  @ApiOperation({ summary: 'Listar relatórios clínicos' })
  @ApiResponse({ status: 200, description: 'Lista de relatórios' })
  @Get()
  @Roles(Role.VETERINARIO, Role.ADMIN)
  findAll() {
    return this.exameService.findRelatorios();
  }

  @ApiOperation({ summary: 'Obter relatório clínico por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes do relatório' })
  @Get(':id')
  @Roles(Role.VETERINARIO, Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exameService.findRelatorio(id);
  }

  @ApiOperation({ summary: 'Emitir relatório clínico de um exame' })
  @ApiResponse({ status: 201, description: 'Relatório emitido com sucesso' })
  @Post()
  @Roles(Role.VETERINARIO)
  create(@Body() dto: CreateRelatorioDto, @Req() req: any) {
    return this.exameService.createRelatorio(dto, getUserId(req));
  }
}
