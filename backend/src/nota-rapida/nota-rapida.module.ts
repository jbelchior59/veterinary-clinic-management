import { Module } from '@nestjs/common';
import { NotaRapidaService } from './nota-rapida.service';
import { NotaRapidaController } from './nota-rapida.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotaRapidaController],
  providers: [NotaRapidaService],
  exports: [NotaRapidaService],
})
export class NotaRapidaModule {}
