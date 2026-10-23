import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RececaoController } from './rececao.controller';
import { RececaoService } from './rececao.service';
import { RececaoGateway } from './rececao.gateway';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [RececaoController],
  providers: [RececaoService, RececaoGateway],
})
export class RececaoModule {}
