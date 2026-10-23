import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/role.enum';
import { FinancialService } from './financial.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('financial-summary')
@Controller('financial-summary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get()
  @ApiOperation({ summary: 'Obter resumo financeiro' })
  getFinancialSummary() {
    return this.financialService.getSummary();
  }

  @Post()
  @ApiOperation({ summary: 'Registar transação financeira' })
  createTransaction(@Body() body: CreateTransactionDto) {
    return this.financialService.create(body);
  }
}