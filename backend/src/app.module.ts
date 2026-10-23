import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DonoModule } from './dono/dono.module';
import { AnimalModule } from './animal/animal.module';
import { MarcacaoModule } from './marcacao/marcacao.module';
import { ConsultaModule } from './consulta/consulta.module';
import { TratamentoModule } from './tratamento/tratamento.module';
import { ExameModule } from './exame/exame.module';
import { InternamentoModule } from './internamento/internamento.module';
import { UsersModule } from './users/users.module';
import { NotaRapidaModule } from './nota-rapida/nota-rapida.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { RececaoModule } from './rececao/rececao.module';
import { FinancialModule } from './financial/financial.module';
import { StockModule } from './stock/stock.module';
import { VacinaModule } from './vacina/vacina.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    DonoModule,
    AnimalModule,
    MarcacaoModule,
    ConsultaModule,
    TratamentoModule,
    ExameModule,
    InternamentoModule,
    UsersModule,
    NotaRapidaModule,
    AuditLogModule,
    RececaoModule,
    FinancialModule,
    StockModule,
    VacinaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
