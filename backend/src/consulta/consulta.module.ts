import { Module } from '@nestjs/common';
import { ConsultaService } from './consulta.service';
import { ConsultaController } from './consulta.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ConsultaController],
  providers: [ConsultaService, PrismaService],
})
export class ConsultaModule {}