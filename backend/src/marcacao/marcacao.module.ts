import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MarcacaoController } from './marcacao.controller';
import { MarcacaoService } from './marcacao.service';
import { MarcacaoGateway } from './marcacao.gateway';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [MarcacaoController],
  providers: [MarcacaoService, MarcacaoGateway],
  exports: [MarcacaoGateway],
})
export class MarcacaoModule {}