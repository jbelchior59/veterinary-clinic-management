import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternamentoController } from './internamento.controller';
import { InternamentoService } from './internamento.service';

@Module({
  imports: [PrismaModule],
  controllers: [InternamentoController],
  providers: [InternamentoService],
})
export class InternamentoModule {}
