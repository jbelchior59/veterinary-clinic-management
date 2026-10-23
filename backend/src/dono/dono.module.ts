import { Module } from '@nestjs/common';
import { DonoController } from './dono.controller';
import { DonoService } from './dono.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DonoController],
  providers: [DonoService],
})
export class DonoModule {}
