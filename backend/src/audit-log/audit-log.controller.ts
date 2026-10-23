import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@ApiTags('Audit Log')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @ApiOperation({ summary: 'Registar ação no log de auditoria' })
  @ApiResponse({ status: 201, description: 'Log criado com sucesso' })
  @Post()
  @Roles(Role.ADMIN, Role.RECECIONISTA, Role.VETERINARIO, Role.TECNICO)
  create(@Body() dto: CreateAuditLogDto) {
    return this.auditLogService.log(dto);
  }

  @ApiOperation({ summary: 'Consultar log de auditoria' })
  @ApiResponse({ status: 200, description: 'Lista de logs de auditoria' })
  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @Query('entidade') entidade?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditLogService.findAll(entidade, userId ? Number(userId) : undefined);
  }
}
