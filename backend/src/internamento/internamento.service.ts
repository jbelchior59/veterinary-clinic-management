import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInternamentoDto } from './dto/create-internamento.dto';
import { CreateObservacaoInternamentoDto } from './dto/create-observacao-internamento.dto';
import { AltaInternamentoDto } from './dto/alta-internamento.dto';

@Injectable()
export class InternamentoService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly pessoaSelect = {
    id: true,
    nome: true,
    email: true,
    role: true,
  };

  private readonly internamentoInclude = {
    animal: {
      include: {
        dono: true,
      },
    },
    veterinario: {
      select: this.pessoaSelect,
    },
    observacoesInternamento: {
      orderBy: {
        data: 'desc' as const,
      },
      include: {
        registadoPor: {
          select: this.pessoaSelect,
        },
      },
    },
  };

  async create(dto: CreateInternamentoDto, veterinarioId: number) {
    const animal = await this.prisma.animal.findUnique({
      where: { id: dto.animalId },
    });

    if (!animal) {
      throw new NotFoundException('Animal não encontrado.');
    }

    const ativo = await this.prisma.internamento.findFirst({
      where: {
        animalId: dto.animalId,
        estado: 'ATIVO',
      },
    });

    if (ativo) {
      throw new BadRequestException('Este animal já tem um internamento ativo.');
    }

    return this.prisma.internamento.create({
      data: {
        animalId: dto.animalId,
        motivo: dto.motivo.trim(),
        observacoes: dto.observacoes?.trim() || null,
        dataEntrada: dto.dataEntrada ? new Date(dto.dataEntrada) : new Date(),
        estado: 'ATIVO',
        veterinarioId,
      },
      include: this.internamentoInclude,
    });
  }

  async findAll() {
    return this.prisma.internamento.findMany({
      orderBy: [{ estado: 'asc' }, { dataEntrada: 'desc' }],
      include: this.internamentoInclude,
    });
  }

  async findAtivos() {
    return this.prisma.internamento.findMany({
      where: { estado: 'ATIVO' },
      orderBy: { dataEntrada: 'desc' },
      include: this.internamentoInclude,
    });
  }

  async findOne(id: number) {
    const internamento = await this.prisma.internamento.findUnique({
      where: { id },
      include: this.internamentoInclude,
    });

    if (!internamento) {
      throw new NotFoundException('Internamento não encontrado.');
    }

    return internamento;
  }

  async addObservacao(
    internamentoId: number,
    dto: CreateObservacaoInternamentoDto,
    registadoPorId: number,
  ) {
    const internamento = await this.findOne(internamentoId);

    if (internamento.estado !== 'ATIVO') {
      throw new BadRequestException('Não é possível adicionar observações a um internamento fechado.');
    }

    return this.prisma.internamentoObservacao.create({
      data: {
        internamentoId,
        observacoes: dto.observacoes.trim(),
        sinaisVitais: dto.sinaisVitais?.trim() || null,
        alimentacao: dto.alimentacao?.trim() || null,
        medicacao: dto.medicacao?.trim() || null,
        data: dto.data ? new Date(dto.data) : new Date(),
        registadoPorId,
      },
      include: {
        registadoPor: {
          select: this.pessoaSelect,
        },
      },
    });
  }

  async darAlta(id: number, dto: AltaInternamentoDto) {
    const internamento = await this.findOne(id);

    if (internamento.estado === 'ALTA') {
      throw new BadRequestException('Este internamento já está fechado.');
    }

    const partes = [
      internamento.observacoes,
      dto.observacoesAlta ? `Alta: ${dto.observacoesAlta}` : null,
    ].filter(Boolean);
    const observacoes = partes.join('\n\n');

    return this.prisma.internamento.update({
      where: { id },
      data: {
        estado: 'ALTA',
        dataAlta: dto.dataAlta ? new Date(dto.dataAlta) : new Date(),
        observacoes: observacoes || internamento.observacoes,
      },
      include: this.internamentoInclude,
    });
  }
}
