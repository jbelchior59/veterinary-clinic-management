import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AmostraController,
  ExameController,
  RelatorioController,
  ResultadoController,
} from './exame.controller';
import { ExameService } from './exame.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ExameController,
    AmostraController,
    ResultadoController,
    RelatorioController,
  ],
  providers: [ExameService],
})
export class ExameModule {}
