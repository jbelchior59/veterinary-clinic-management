import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVacinaDto } from './dto/create-vacina.dto';
import { UpdateVacinaDto } from './dto/update-vacina.dto';

@Injectable()
export class VacinaService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly vacinaInclude = {
    animal: { select: { id: true, nome: true, especie: true } },
    aplicadoPor: { select: { id: true, nome: true, email: true } },
  };

  async create(dto: CreateVacinaDto, aplicadoPorId: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
    if (!animal) throw new NotFoundException(`Animal com id ${dto.animalId} não encontrado.`);

    return this.prisma.vacina.create({
      data: {
        nome: dto.nome,
        lote: dto.lote ?? null,
        fabricante: dto.fabricante ?? null,
        dataAplicacao: new Date(dto.dataAplicacao),
        proximaDose: dto.proximaDose ? new Date(dto.proximaDose) : null,
        observacoes: dto.observacoes ?? null,
        animalId: dto.animalId,
        aplicadoPorId,
      },
      include: this.vacinaInclude,
    });
  }

  async findByAnimal(animalId: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) throw new NotFoundException(`Animal com id ${animalId} não encontrado.`);

    return this.prisma.vacina.findMany({
      where: { animalId },
      include: this.vacinaInclude,
      orderBy: { dataAplicacao: 'desc' },
    });
  }

  async findAlertasProximasDoses(days = 30) {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + days);

    return this.prisma.vacina.findMany({
      where: {
        proximaDose: { gte: hoje, lte: limite },
      },
      include: this.vacinaInclude,
      orderBy: { proximaDose: 'asc' },
    });
  }

  async update(id: number, dto: UpdateVacinaDto) {
    const vacina = await this.prisma.vacina.findUnique({ where: { id } });
    if (!vacina) throw new NotFoundException(`Vacina com id ${id} não encontrada.`);

    return this.prisma.vacina.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.lote !== undefined && { lote: dto.lote }),
        ...(dto.fabricante !== undefined && { fabricante: dto.fabricante }),
        ...(dto.dataAplicacao !== undefined && { dataAplicacao: new Date(dto.dataAplicacao) }),
        ...(dto.proximaDose !== undefined && { proximaDose: dto.proximaDose ? new Date(dto.proximaDose) : null }),
        ...(dto.observacoes !== undefined && { observacoes: dto.observacoes }),
      },
      include: this.vacinaInclude,
    });
  }

  async remove(id: number) {
    const vacina = await this.prisma.vacina.findUnique({ where: { id } });
    if (!vacina) throw new NotFoundException(`Vacina com id ${id} não encontrada.`);
    return this.prisma.vacina.delete({ where: { id } });
  }
}
