import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateComunicacaoDto } from './dto/create-comunicacao.dto';
import { CreateFaturaDto } from './dto/create-fatura.dto';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { CreateHorarioProfissionalDto } from './dto/create-horario-profissional.dto';
import { UpdateComunicacaoDto } from './dto/update-comunicacao.dto';
import { UpdateHorarioEstadoDto } from './dto/update-horario-estado.dto';
import { CreateServicoCatalogoDto } from './dto/create-servico-catalogo.dto';
import { UpdateServicoCatalogoDto } from './dto/update-servico-catalogo.dto';
import { RececaoGateway } from './rececao.gateway';

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateOrToday(date?: string) {
  if (!date) return new Date();

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Data inválida');
  }

  return parsed;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

@Injectable()
export class RececaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RececaoGateway,
    private readonly auditLog: AuditLogService,
  ) {}

  async dashboard() {
    const now = new Date();
    const inicio = startOfDay(now);
    const fim = endOfDay(now);

    const [
      marcacoesHoje,
      consultasHoje,
      faturasPendentes,
      comunicacoesHoje,
      horariosAtivos,
    ] = await Promise.all([
      this.prisma.marcacao.findMany({
        where: { data: { gte: inicio, lte: fim } },
      }),
      this.prisma.consulta.findMany({
        where: { data: { gte: inicio, lte: fim } },
      }),
      this.prisma.fatura.findMany({ where: { estado: 'PENDENTE' } }),
      this.prisma.comunicacao.findMany({
        where: { data: { gte: inicio, lte: fim } },
      }),
      (this.prisma as any).horarioProfissional.findMany({ where: { ativo: true } }),
    ]);

    return {
      consultasHoje: consultasHoje.length,
      marcacoesHoje: marcacoesHoje.length,
      checkInsHoje: marcacoesHoje.filter((m) => m.estado === 'CONFIRMADA')
        .length,
      concluidasHoje: marcacoesHoje.filter((m) => m.estado === 'CONCLUIDA')
        .length,
      faturasPendentes: faturasPendentes.length,
      comunicacoesHoje: comunicacoesHoje.length,
      profissionaisComHorario: horariosAtivos.length,
    };
  }

  async dashboardTecnico() {
    const now = new Date();
    const inicio = startOfDay(now);
    const fim = endOfDay(now);
    const limiteValidade = new Date(now);

    limiteValidade.setDate(limiteValidade.getDate() + 30);
    limiteValidade.setHours(23, 59, 59, 999);

    const [
      pendentes,
      amostraColetada,
      concluidosAguardaValidacao,
      concluidosHoje,
      examesPendentesAntigos,
      stockItems,
    ] = await Promise.all([
      this.prisma.exame.count({ where: { estado: 'PENDENTE' } }),
      this.prisma.exame.count({ where: { estado: 'AMOSTRA_COLETADA' } }),
      this.prisma.exame.count({ where: { estado: 'CONCLUIDO' } }),
      this.prisma.exame.count({
        where: {
          estado: 'CONCLUIDO',
          dataConclusao: { gte: inicio, lte: fim },
        },
      }),
      this.prisma.exame.findMany({
        where: { estado: 'PENDENTE' },
        orderBy: { dataPedido: 'asc' },
        take: 5,
        include: {
          animal: { include: { dono: true } },
          solicitante: {
            select: { id: true, nome: true, email: true, role: true },
          },
        },
      }),
      (this.prisma as any).stockItem.findMany({
        orderBy: [{ validade: 'asc' }, { quantidade: 'asc' }],
      }),
    ]);

    const alertasStock = stockItems
      .filter((item) => {
        const baixoStock = item.quantidade <= item.quantidadeMin;
        const validadeAlerta = item.validade
          ? item.validade <= limiteValidade
          : false;

        return baixoStock || validadeAlerta;
      })
      .map((item) => ({
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        quantidade: item.quantidade,
        quantidadeMin: item.quantidadeMin,
        unidade: item.unidade,
        validade: item.validade,
        baixoStock: item.quantidade <= item.quantidadeMin,
        validadeAlerta: item.validade ? item.validade <= limiteValidade : false,
      }));

    return {
      examesPorEstado: {
        PENDENTE: pendentes,
        AMOSTRA_COLETADA: amostraColetada,
        CONCLUIDO: concluidosAguardaValidacao,
      },
      examesConcluidosHoje: concluidosHoje,
      examesPendentesAntigos: examesPendentesAntigos.map((exame) => ({
        id: exame.id,
        tipo: exame.tipo,
        estado: exame.estado,
        prioridade: exame.prioridade,
        dataPedido: exame.dataPedido,
        animal: exame.animal
          ? {
              id: exame.animal.id,
              nome: exame.animal.nome,
              especie: exame.animal.especie,
              dono: exame.animal.dono
                ? {
                    id: exame.animal.dono.id,
                    nome: exame.animal.dono.nome,
                  }
                : null,
            }
          : null,
        solicitante: exame.solicitante,
      })),
      alertasStock,
    };
  }

  async dashboardVeterinario() {
    const now = new Date();
    const inicio = startOfDay(now);
    const fim = endOfDay(now);
    const em30dias = new Date(now);
    em30dias.setDate(em30dias.getDate() + 30);
    em30dias.setHours(23, 59, 59, 999);

    const [
      marcacoesHoje,
      examesPorValidar,
      examesPorValidarTotal,
      internamentosAtivos,
      alertasVacinasTotal,
      alertasVacinas,
    ] = await Promise.all([
      this.prisma.marcacao.findMany({
        where: {
          data: { gte: inicio, lte: fim },
          estado: { in: ['AGENDADA', 'CONFIRMADA', 'CONCLUIDA'] },
        },
        include: {
          animal: { select: { id: true, nome: true, especie: true } },
        },
        orderBy: { data: 'asc' },
      }),
      this.prisma.exame.findMany({
        where: { estado: 'CONCLUIDO' },
        include: {
          animal: { select: { id: true, nome: true, especie: true } },
        },
        orderBy: { dataConclusao: 'asc' },
        take: 5,
      }),
      this.prisma.exame.count({ where: { estado: 'CONCLUIDO' } }),
      this.prisma.internamento.findMany({
        where: { estado: 'ATIVO' },
        include: {
          animal: { select: { id: true, nome: true, especie: true } },
        },
        orderBy: { dataEntrada: 'asc' },
      }),
      this.prisma.vacina.count({
        where: { proximaDose: { lte: em30dias } },
      }),
      this.prisma.vacina.findMany({
        where: { proximaDose: { lte: em30dias } },
        include: {
          animal: { select: { id: true, nome: true, especie: true } },
        },
        orderBy: { proximaDose: 'asc' },
        take: 5,
      }),
    ]);

    return {
      totais: {
        marcacoesHoje: marcacoesHoje.length,
        examesPorValidar: examesPorValidarTotal,
        internamentosAtivos: internamentosAtivos.length,
        alertasVacinas: alertasVacinasTotal,
      },
      marcacoesHoje: marcacoesHoje.map((m) => ({
        id: m.id,
        hora: m.data.toISOString(),
        estado: m.estado,
        motivo: m.motivo ?? null,
        animal: m.animal
          ? { id: m.animal.id, nome: m.animal.nome, especie: m.animal.especie }
          : null,
      })),
      examesPorValidar: examesPorValidar.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        prioridade: e.prioridade,
        dataConclusao: e.dataConclusao?.toISOString() ?? null,
        animal: e.animal
          ? { id: e.animal.id, nome: e.animal.nome, especie: e.animal.especie }
          : null,
      })),
      internamentosAtivos: internamentosAtivos.map((i) => ({
        id: i.id,
        motivo: i.motivo,
        dataEntrada: i.dataEntrada.toISOString(),
        animal: i.animal
          ? { id: i.animal.id, nome: i.animal.nome, especie: i.animal.especie }
          : null,
      })),
      alertasVacinas: alertasVacinas.map((v) => ({
        id: v.id,
        nome: v.nome,
        proximaDose: v.proximaDose?.toISOString() ?? null,
        animal: v.animal
          ? { id: v.animal.id, nome: v.animal.nome, especie: v.animal.especie }
          : null,
      })),
    };
  }

  async getMonthlyStats() {
    const meses = this.getLastMonthStarts(6);
    const start = meses[0];
    const end = new Date(
      meses[meses.length - 1].getFullYear(),
      meses[meses.length - 1].getMonth() + 1,
      1,
    );

    const [
      marcacoesPorMes,
      receitaPorMes,
      distribuicaoEspecie,
      topMotivos,
    ] = await Promise.all([
      this.getMarcacoesPorMes(meses),
      this.getReceitaPorMes(meses),
      this.getDistribuicaoEspecie(),
      this.getTopMotivos(start, end),
    ]);

    return {
      marcacoesPorMes,
      receitaPorMes,
      distribuicaoEspecie,
      topMotivos,
    };
  }

  private getLastMonthStarts(count: number) {
    const now = new Date();

    return Array.from({ length: count }, (_, index) => {
      return new Date(
        now.getFullYear(),
        now.getMonth() - (count - 1 - index),
        1,
      );
    });
  }

  private async getMarcacoesPorMes(meses: Date[]) {
    const rows = await Promise.all(
      meses.map(async (mes) => {
        const { start, end } = monthRange(mes);
        const grouped = await this.prisma.marcacao.groupBy({
          by: ['estado'],
          where: {
            data: {
              gte: start,
              lt: end,
            },
          },
          _count: {
            _all: true,
          },
        });

        return {
          mes: monthKey(mes),
          total: grouped.reduce((sum, item) => sum + item._count._all, 0),
          concluidas:
            grouped.find((item) => item.estado === 'CONCLUIDA')?._count._all ??
            0,
          canceladas:
            grouped.find((item) => item.estado === 'CANCELADA')?._count._all ??
            0,
        };
      }),
    );

    return rows;
  }

  private async getReceitaPorMes(meses: Date[]) {
    return Promise.all(
      meses.map(async (mes) => {
        const { start, end } = monthRange(mes);
        const result = await this.prisma.fatura.aggregate({
          where: {
            estado: 'PAGA',
            dataEmissao: {
              gte: start,
              lt: end,
            },
          },
          _sum: {
            valor: true,
          },
        });

        return {
          mes: monthKey(mes),
          receita: result._sum.valor ?? 0,
        };
      }),
    );
  }

  private async getDistribuicaoEspecie() {
    const grouped = await this.prisma.animal.groupBy({
      by: ['especie'],
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          especie: 'desc',
        },
      },
    });

    return grouped.map((item) => ({
      especie: item.especie,
      total: item._count._all,
    }));
  }

  private async getTopMotivos(start: Date, end: Date) {
    const grouped = await this.prisma.marcacao.groupBy({
      by: ['motivo'],
      where: {
        data: {
          gte: start,
          lt: end,
        },
        motivo: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          motivo: 'desc',
        },
      },
      take: 5,
    });

    return grouped.map((item) => ({
      motivo: item.motivo ?? 'Sem motivo',
      total: item._count._all,
    }));
  }

  async agenda(modo?: string, data?: string) {
    const base = parseDateOrToday(data);
    const inicio = modo === 'semana' ? startOfWeek(base) : startOfDay(base);
    const fim = modo === 'semana' ? endOfWeek(base) : endOfDay(base);

    return this.prisma.marcacao.findMany({
      where: {
        data: { gte: inicio, lte: fim },
        estado: { in: ['AGENDADA', 'CONFIRMADA', 'CONCLUIDA'] },
      },
      include: {
        animal: { include: { dono: true } },
        criadoPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
      orderBy: { data: 'asc' },
    });
  }

  async alertas() {
    const now = new Date();
    const daqui2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const [
      marcacoesProximas,
      faturasVencidas,
      pedidosPendentes,
      possiveisAtrasos,
    ] = await Promise.all([
      this.prisma.marcacao.findMany({
        where: {
          data: { gte: now, lte: daqui2h },
          estado: { in: ['AGENDADA', 'CONFIRMADA'] },
        },
        include: { animal: { include: { dono: true } } },
        orderBy: { data: 'asc' },
      }),
      this.prisma.fatura.findMany({
        where: {
          estado: 'PENDENTE',
          dataVencimento: { lt: now },
        },
        include: { animal: { include: { dono: true } } },
      }),
      this.prisma.comunicacao.findMany({
        where: { estado: 'PENDENTE' },
        include: { animal: { include: { dono: true } } },
        orderBy: { data: 'desc' },
        take: 10,
      }),
      this.prisma.marcacao.findMany({
        where: {
          data: { lt: now },
          estado: { in: ['AGENDADA', 'CONFIRMADA'] },
        },
        include: { animal: { include: { dono: true } } },
        orderBy: { data: 'asc' },
        take: 10,
      }),
    ]);

    return {
      marcacoesProximas,
      faturasVencidas,
      pedidosPendentes,
      possiveisAtrasos,
    };
  }

  async profissionaisDisponiveis(data?: string) {
    const base = parseDateOrToday(data);
    const diaSemana = base.getDay();

    return (this.prisma as any).horarioProfissional.findMany({
      where: { diaSemana, ativo: true },
      include: {
        user: { select: { id: true, nome: true, email: true, role: true } },
        criadoPor: { select: { id: true, nome: true, email: true } },
      },
      orderBy: [{ horaEntrada: 'asc' }, { userId: 'asc' }],
    });
  }

  async profissionais() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['VETERINARIO', 'TECNICO', 'RECECIONISTA'] },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { nome: 'asc' }, { email: 'asc' }],
    });
  }

  async createComunicacao(dto: CreateComunicacaoDto, criadoPorId?: number) {
    if (dto.animalId) {
      const animal = await this.prisma.animal.findUnique({
        where: { id: dto.animalId },
      });

      if (!animal) {
        throw new BadRequestException(
          `Animal com id ${dto.animalId} não encontrado`,
        );
      }
    }

    const comunicacao = await this.prisma.comunicacao.create({
      data: {
        tipo: dto.tipo,
        canal: dto.canal,
        assunto: dto.assunto,
        mensagem: dto.mensagem,
        animalId: dto.animalId ?? null,
        criadoPorId: criadoPorId ?? null,
      },
      include: {
        animal: { include: { dono: true } },
        criadoPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });

    this.gateway.emitComunicacaoCriada(comunicacao);
    void this.auditLog.log({ acao: 'CRIAR', entidade: 'COMUNICACAO', entidadeId: comunicacao.id, userId: criadoPorId });
    return comunicacao;
  }

  async updateComunicacao(id: number, dto: UpdateComunicacaoDto) {
    const existing = await this.prisma.comunicacao.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Comunicação com id ${id} não encontrada`);
    }

    if (dto.animalId) {
      const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
      if (!animal) {
        throw new BadRequestException(`Animal com id ${dto.animalId} não encontrado`);
      }
    }

    const comunicacao = await this.prisma.comunicacao.update({
      where: { id },
      data: {
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.canal !== undefined ? { canal: dto.canal } : {}),
        ...(dto.assunto !== undefined ? { assunto: dto.assunto } : {}),
        ...(dto.mensagem !== undefined ? { mensagem: dto.mensagem } : {}),
        ...(dto.animalId !== undefined ? { animalId: dto.animalId } : {}),
      },
      include: {
        animal: { include: { dono: true } },
        criadoPor: { select: { id: true, nome: true, email: true, role: true } },
      },
    });

    this.gateway.emitComunicacaoAtualizada(comunicacao);
    return comunicacao;
  }

  async deleteComunicacao(id: number) {
    const existing = await this.prisma.comunicacao.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Comunicação com id ${id} não encontrada`);
    }

    await this.prisma.comunicacao.delete({ where: { id } });
    this.gateway.emitComunicacaoRemovida({ id });
    return { ok: true };
  }

  async listarComunicacoes() {
    return this.prisma.comunicacao.findMany({
      include: {
        animal: { include: { dono: true } },
        criadoPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
      orderBy: { data: 'desc' },
      take: 100,
    });
  }

  async createFatura(dto: CreateFaturaDto, criadaPorId?: number) {
    const animal = await this.prisma.animal.findUnique({
      where: { id: dto.animalId },
    });

    if (!animal) {
      throw new BadRequestException(
        `Animal com id ${dto.animalId} não encontrado`,
      );
    }

    if (dto.linhas && dto.linhas.length > 0) {
      for (const linha of dto.linhas) {
        if (linha.servicoId) {
          const servico = await this.prisma.servicoCatalogo.findUnique({
            where: { id: linha.servicoId },
          });

          if (!servico) {
            throw new BadRequestException(
              `Serviço com id ${linha.servicoId} não encontrado`,
            );
          }
        }
      }
    }

    const fatura = await this.prisma.fatura.create({
      data: {
        numero: dto.numero,
        valor: dto.valor,
        descricao: dto.descricao,
        dataVencimento: dto.dataVencimento
          ? new Date(dto.dataVencimento)
          : null,
        animalId: dto.animalId,
        criadaPorId: criadaPorId ?? null,
        linhas: dto.linhas
          ? {
              create: dto.linhas.map((linha) => ({
                descricao: linha.descricao || '',
                quantidade: linha.quantidade,
                precoUnit: linha.precoUnit,
                total: linha.quantidade * linha.precoUnit,
                servicoId: linha.servicoId || null,
              })),
            }
          : undefined,
      },
      include: {
        animal: { include: { dono: true } },
        criadaPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
        pagamentos: true,
        linhas: true,
      },
    });

    void this.auditLog.log({ acao: 'CRIAR', entidade: 'FATURA', entidadeId: fatura.id, userId: criadaPorId, detalhes: `valor: ${fatura.valor}` });
    return fatura;
  }

  async getFaturaDetalhada(id: number) {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id },
      include: {
        animal: { include: { dono: true } },
        linhas: { orderBy: { id: 'asc' } },
        pagamentos: { orderBy: { dataPagamento: 'asc' } },
        criadaPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });

    if (!fatura) {
      throw new NotFoundException(`Fatura com id ${id} não encontrada`);
    }

    return fatura;
  }

  async faturasPendentes() {
    return this.prisma.fatura.findMany({
      where: { estado: 'PENDENTE' },
      include: {
        animal: { include: { dono: true } },
        pagamentos: true,
        linhas: { orderBy: { id: 'asc' } },
      },
      orderBy: [{ dataVencimento: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async faturasTodas() {
    return this.prisma.fatura.findMany({
      include: {
        animal: { include: { dono: true } },
        pagamentos: true,
        linhas: { orderBy: { id: 'asc' } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async registarPagamento(
    faturaId: number,
    dto: CreatePagamentoDto,
    registadoPorId?: number,
  ) {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id: faturaId },
    });

    if (!fatura) {
      throw new NotFoundException(`Fatura com id ${faturaId} não encontrada`);
    }

    const pagamento = await this.prisma.pagamento.create({
      data: {
        faturaId,
        valor: dto.valor,
        metodo: dto.metodo,
        referencia: dto.referencia,
        registadoPorId: registadoPorId ?? null,
      },
      include: {
        fatura: {
          include: { animal: { include: { dono: true } }, pagamentos: true },
        },
        registadoPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });

    const totalPago = await this.prisma.pagamento.aggregate({
      where: { faturaId },
      _sum: { valor: true },
    });

    void this.auditLog.log({ acao: 'PAGAMENTO', entidade: 'FATURA', entidadeId: faturaId, userId: registadoPorId, detalhes: `valor: ${dto.valor}, metodo: ${dto.metodo}` });

    if ((totalPago._sum.valor ?? 0) >= fatura.valor) {
      const updated = await this.prisma.fatura.update({
        where: { id: faturaId },
        data: { estado: 'PAGA' },
        include: { animal: { include: { dono: true } }, pagamentos: true },
      });
      this.gateway.emitFaturaPaga(updated);
    }

    return pagamento;
  }

  async criarHorario(dto: CreateHorarioProfissionalDto, criadoPorId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new BadRequestException(
        `Utilizador com id ${dto.userId} não encontrado`,
      );
    }

    return (this.prisma as any).horarioProfissional.create({
      data: {
        userId: dto.userId,
        diaSemana: dto.diaSemana,
        horaEntrada: dto.horaEntrada,
        horaSaida: dto.horaSaida,
        ativo: dto.ativo ?? true,
        estado: dto.estado ?? 'ATIVO',
        observacoes: dto.observacoes,
        criadoPorId: criadoPorId ?? null,
      },
      include: {
        user: { select: { id: true, nome: true, email: true, role: true } },
        criadoPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
    });
  }

  async updateHorarioEstado(id: number, dto: UpdateHorarioEstadoDto) {
    const horario = await (this.prisma as any).horarioProfissional.findUnique({ where: { id } });
    if (!horario) {
      throw new NotFoundException(`Horário com id ${id} não encontrado`);
    }

    const updated = await (this.prisma as any).horarioProfissional.update({
      where: { id },
      data: { estado: dto.estado, ativo: dto.estado === 'ATIVO' } as any,
      include: {
        user: { select: { id: true, nome: true, email: true, role: true } },
        criadoPor: { select: { id: true, nome: true, email: true, role: true } },
      },
    } as any);

    this.gateway.emitHorarioAtualizado(updated);
    return updated;
  }

  async horarios() {
    return (this.prisma as any).horarioProfissional.findMany({
      include: {
        user: { select: { id: true, nome: true, email: true, role: true } },
        criadoPor: {
          select: { id: true, nome: true, email: true, role: true },
        },
      },
      orderBy: [{ diaSemana: 'asc' }, { horaEntrada: 'asc' }],
    });
  }

  // ─── Catálogo de Serviços ────────────────────────────────────────────────────

  async getServicos() {
    return this.findServicosAtivos();
  }

  async createServico(dto: CreateServicoCatalogoDto) {
    if (!dto.nome?.trim()) {
      throw new BadRequestException('O nome do serviço é obrigatório');
    }

    if (!dto.categoria?.trim()) {
      throw new BadRequestException('A categoria do serviço é obrigatória');
    }

    if (!Number.isFinite(Number(dto.preco)) || Number(dto.preco) <= 0) {
      throw new BadRequestException('O preço do serviço tem de ser válido');
    }

    return this.prisma.servicoCatalogo.create({
      data: {
        nome: dto.nome.trim(),
        categoria: dto.categoria.trim(),
        preco: Number(dto.preco),
        descricao: dto.descricao?.trim() || null,
        ativo: true,
      },
    });
  }

  async updateServico(id: number, dto: UpdateServicoCatalogoDto) {
    await this.ensureServicoExists(id);

    if (dto.nome !== undefined && !dto.nome.trim()) {
      throw new BadRequestException('O nome do serviço é obrigatório');
    }

    if (dto.categoria !== undefined && !dto.categoria.trim()) {
      throw new BadRequestException('A categoria do serviço é obrigatória');
    }

    if (
      dto.preco !== undefined &&
      (!Number.isFinite(Number(dto.preco)) || Number(dto.preco) <= 0)
    ) {
      throw new BadRequestException('O preço do serviço tem de ser válido');
    }

    return this.prisma.servicoCatalogo.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome.trim() }),
        ...(dto.categoria !== undefined && { categoria: dto.categoria.trim() }),
        ...(dto.preco !== undefined && { preco: Number(dto.preco) }),
        ...(dto.descricao !== undefined && {
          descricao: dto.descricao?.trim() || null,
        }),
        ...(dto.ativo !== undefined && { ativo: dto.ativo }),
      },
    });
  }

  async toggleServico(id: number) {
    const servico = await this.ensureServicoExists(id);

    return this.prisma.servicoCatalogo.update({
      where: { id },
      data: {
        ativo: !servico.ativo,
      },
    });
  }

  async findServicosCatalogo() {
    return this.prisma.servicoCatalogo.findMany({
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
  }

  async findServicosAtivos() {
    return this.prisma.servicoCatalogo.findMany({
      where: {
        ativo: true,
      },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
  }

  private async ensureServicoExists(id: number) {
    const servico = await this.prisma.servicoCatalogo.findUnique({
      where: { id },
    });

    if (!servico) {
      throw new NotFoundException(`Serviço com id ${id} não encontrado`);
    }

    return servico;
  }
}
