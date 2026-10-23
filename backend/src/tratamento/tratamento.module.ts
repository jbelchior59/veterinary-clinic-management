import { Module } from '@nestjs/common';
import { TratamentoController } from './tratamento.controller';
import { TratamentoService } from './tratamento.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TratamentoController],
  providers: [TratamentoService, PrismaService],
})
export class TratamentoModule {}