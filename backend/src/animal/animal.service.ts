import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { HistoricoAnimalDto } from './dto/historico-animal.dto';

@Injectable()
export class AnimalService {
  constructor(
    private prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(data: CreateAnimalDto) {
    const dono = await this.prisma.dono.findUnique({ where: { id: data.donoId } });
    if (!dono) throw new BadRequestException(`Dono com id ${data.donoId} não encontrado`);
    const animal = await this.prisma.animal.create({ data, include: { dono: true } });
    void this.auditLog.log({ acao: 'CRIAR', entidade: 'ANIMAL', entidadeId: animal.id, detalhes: `nome: ${animal.nome}` });
    return animal;
  }

  findAll() {
    return this.prisma.animal.findMany({ include: { dono: true } });
  }

  async findOne(id: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id }, include: { dono: true } });
    if (!animal) throw new NotFoundException(`Animal com id ${id} não encontrado`);
    return animal;
  }

async getHistorico(id: number) {
  const animal = await this.prisma.animal.findUnique({
    where: { id },
    include: {
      dono: true,
      consultas: {
        orderBy: { data: 'desc' },
        include: {
          tratamentos: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      marcacoes: {
        orderBy: { data: 'desc' },
      },
    },
  });

  if (!animal) {
    throw new NotFoundException(`Animal com id ${id} não encontrado`);
  }

  const consultas = animal.consultas ?? [];
  const marcacoes = animal.marcacoes ?? [];

  return {
    id: animal.id,
    animalId: animal.id,
    nome: animal.nome,
    especie: animal.especie,
    dono: animal.dono
      ? {
          id: animal.dono.id,
          nome: animal.dono.nome,
          email: animal.dono.email,
          telefone: animal.dono.telefone ?? null,
        }
      : null,
    alergias: (animal as any).alergias ?? null,
    alertasClinicos: (animal as any).alertasClinicos ?? null,
    totalConsultas: consultas.length,
    totalTratamentos: consultas.reduce(
      (acc, consulta) => acc + (consulta.tratamentos?.length ?? 0),
      0,
    ),
    marcacoes: marcacoes.map((m) => ({
      id: m.id,
      data: m.data,
      motivo: m.motivo,
      estado: m.estado,
    })),
    consultas: consultas.map((consulta) => ({
      id: consulta.id,
      data: consulta.data,
      observacoes: consulta.observacoes,
      diagnostico: consulta.diagnostico,
      pesoRegistado: (consulta as any).pesoRegistado ?? null,
      tratamentos: (consulta.tratamentos ?? []).map((tratamento) => ({
        id: tratamento.id,
        descricao: tratamento.descricao,
        medicacao: tratamento.medicacao ?? null,
        createdAt: tratamento.createdAt,
      })),
    })),
  };
}

  async update(id: number, data: UpdateAnimalDto) {
    const animal = await this.prisma.animal.findUnique({ where: { id } });
    if (!animal) throw new NotFoundException(`Animal com id ${id} não encontrado`);

    if (data.donoId) {
      const dono = await this.prisma.dono.findUnique({ where: { id: data.donoId } });
      if (!dono) throw new BadRequestException(`Dono com id ${data.donoId} não encontrado`);
    }

    const updated = await this.prisma.animal.update({ where: { id }, data, include: { dono: true } });
    void this.auditLog.log({ acao: 'ATUALIZAR', entidade: 'ANIMAL', entidadeId: id });
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const deleted = await this.prisma.animal.delete({ where: { id } });
    void this.auditLog.log({ acao: 'ELIMINAR', entidade: 'ANIMAL', entidadeId: id });
    return deleted;
  }
}