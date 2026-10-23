import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateMarcacaoDto } from './dto/create-marcacao.dto';
import { UpdateMarcacaoDto } from './dto/update-marcacao.dto';
import { MarcacaoGateway } from './marcacao.gateway';

const JANELA_MINUTOS = 30;

@Injectable()
export class MarcacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MarcacaoGateway,
    private readonly auditLog: AuditLogService,
  ) {}

  // Verifica se existe marcação AGENDADA ou CONFIRMADA numa janela de ±30 minutos
  private async verificarSobreposicao(data: Date, excluirId?: number) {
    const janela = JANELA_MINUTOS * 60 * 1000;
    const inicio = new Date(data.getTime() - janela);
    const fim = new Date(data.getTime() + janela);

    const prismaAny = this.prisma as any;

    const conflito = await prismaAny.marcacao.findFirst({
      where: {
        estado: { in: ['AGENDADA', 'CONFIRMADA'] },
        data: { gte: inicio, lte: fim },
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
    });

    if (conflito) {
      const horario = new Date(conflito.data).toLocaleString('pt-PT', {
        timeZone: 'Europe/Lisbon',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new BadRequestException(
        `Já existe uma marcação agendada próxima desse horário (${horario}). Por favor, escolha um horário com pelo menos 31 minutos de diferença.`,
      );
    }
  }

  async create(createMarcacaoDto: CreateMarcacaoDto, criadoPorId?: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id: createMarcacaoDto.animalId } });

    if (!animal) {
      throw new BadRequestException(`Animal com id ${createMarcacaoDto.animalId} não encontrado`);
    }

    const dataMarcacao = new Date(createMarcacaoDto.data);

    if (dataMarcacao <= new Date()) {
      throw new BadRequestException('Não é possível criar marcações com datas no passado');
    }

    await this.verificarSobreposicao(dataMarcacao);

    const prismaAny = this.prisma as any;

    let profissionalId = createMarcacaoDto.profissionalId ?? null;

    if (profissionalId) {
      const profissional = await this.prisma.user.findUnique({ where: { id: profissionalId } });
      if (!profissional) {
        throw new NotFoundException(`Profissional com id ${profissionalId} não encontrado`);
      }
    } else {
      const ativo = await prismaAny.horarioProfissional.findFirst({
        where: { ativo: true, user: { role: { not: 'ADMIN' } } },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: { userId: true },
      });
      profissionalId = ativo?.userId ?? null;
    }

    const marcacao = await prismaAny.marcacao.create({
      data: {
        data: dataMarcacao,
        motivo: createMarcacaoDto.motivo,
        estado: 'AGENDADA',
        animalId: createMarcacaoDto.animalId,
        criadoPorId: criadoPorId ?? null,
        profissionalId,
      },
      include: {
        animal: { include: { dono: true } },
        profissional: { select: { id: true, nome: true, email: true, role: true } },
        criadoPor: { select: { id: true, nome: true, email: true } },
      } as any,
    });

    this.gateway.emitMarcacaoCriada(marcacao);
    void this.auditLog.log({ acao: 'CRIAR', entidade: 'MARCACAO', entidadeId: marcacao.id, userId: criadoPorId });

    return marcacao;
  }

  async update(id: number, updateMarcacaoDto: UpdateMarcacaoDto) {
    const marcacao = await this.prisma.marcacao.findUnique({ where: { id } });

    if (!marcacao) {
      throw new NotFoundException(`Marcação com id ${id} não encontrada`);
    }

    if (marcacao.estado !== 'AGENDADA') {
      throw new BadRequestException('Só é possível editar marcações agendadas.');
    }

    const data: Record<string, unknown> = {};

    if (updateMarcacaoDto.data) {
      const novaData = new Date(updateMarcacaoDto.data);
      if (novaData <= new Date()) {
        throw new BadRequestException('A nova data não pode ser no passado');
      }
      await this.verificarSobreposicao(novaData, id);
      data.data = novaData;
    }

    if (updateMarcacaoDto.motivo !== undefined) {
      data.motivo = updateMarcacaoDto.motivo;
    }

    const updated = await (this.prisma as any).marcacao.update({
      where: { id },
      data,
      include: { animal: { include: { dono: true } }, profissional: { select: { id: true, nome: true, email: true, role: true } } },
    });

    this.gateway.emitMarcacaoAtualizada(updated);
    void this.auditLog.log({ acao: 'ATUALIZAR', entidade: 'MARCACAO', entidadeId: id });

    return updated;
  }

  async findAllAtivas() {
    return (this.prisma as any).marcacao.findMany({
      where: { estado: { in: ['AGENDADA', 'CONFIRMADA'] } },
      include: { animal: { include: { dono: true } }, criadoPor: { select: { id: true, nome: true, email: true } }, profissional: { select: { id: true, nome: true, email: true, role: true } } },
      orderBy: { data: 'asc' },
    });
  }

  async findAllHistorico() {
    return (this.prisma as any).marcacao.findMany({
      include: { animal: { include: { dono: true } }, criadoPor: { select: { id: true, nome: true, email: true } }, profissional: { select: { id: true, nome: true, email: true, role: true } } },
      orderBy: { data: 'asc' },
    });
  }

  async findHoje() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return (this.prisma as any).marcacao.findMany({
      where: {
        data: { gte: startOfDay, lte: endOfDay },
        estado: { in: ['AGENDADA', 'CONFIRMADA'] },
      },
      include: { animal: { include: { dono: true } }, criadoPor: { select: { id: true, nome: true, email: true } } },
      orderBy: { data: 'asc' },
    });
  }

  async confirmar(id: number) {
    const marcacao = await this.prisma.marcacao.findUnique({ where: { id } });

    if (!marcacao) {
      throw new NotFoundException(`Marcação com id ${id} não encontrada`);
    }

    if (marcacao.estado !== 'AGENDADA') {
      throw new BadRequestException('Só é possível confirmar marcações agendadas.');
    }

    return (this.prisma as any).marcacao.update({
      where: { id },
      data: { estado: 'CONFIRMADA' },
      include: { animal: { include: { dono: true } } },
    }).then((updated) => {
      this.gateway.emitMarcacaoAtualizada(updated);
      void this.auditLog.log({ acao: 'CONFIRMAR', entidade: 'MARCACAO', entidadeId: id });
      return updated;
    });
  }

  async cancelar(id: number) {
    const marcacao = await this.prisma.marcacao.findUnique({ where: { id } });

    if (!marcacao) {
      throw new NotFoundException(`Marcação com id ${id} não encontrada`);
    }

    if (!['AGENDADA', 'CONFIRMADA'].includes(marcacao.estado)) {
      throw new BadRequestException('Só é possível cancelar marcações agendadas ou confirmadas.');
    }

    return (this.prisma as any).marcacao.update({
      where: { id },
      data: { estado: 'CANCELADA' },
      include: { animal: { include: { dono: true } } },
    }).then((updated) => {
      this.gateway.emitMarcacaoAtualizada(updated);
      void this.auditLog.log({ acao: 'CANCELAR', entidade: 'MARCACAO', entidadeId: id });
      return updated;
    });
  }

  async concluir(id: number) {
    const marcacao = await this.prisma.marcacao.findUnique({ where: { id } });

    if (!marcacao) {
      throw new NotFoundException(`Marcação com id ${id} não encontrada`);
    }

    if (!['AGENDADA', 'CONFIRMADA'].includes(marcacao.estado)) {
      throw new BadRequestException('Só é possível concluir marcações agendadas ou confirmadas.');
    }

    return (this.prisma as any).marcacao.update({
      where: { id },
      data: { estado: 'CONCLUIDA' },
      include: { animal: { include: { dono: true } } },
    }).then((updated) => {
      this.gateway.emitMarcacaoAtualizada(updated);
      void this.auditLog.log({ acao: 'CONCLUIR', entidade: 'MARCACAO', entidadeId: id });
      return updated;
    });
  }
}
