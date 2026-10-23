import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';

@Injectable()
export class ConsultaService {
  constructor(private prisma: PrismaService) {}

  private readonly pessoaSelect = {
    id: true,
    nome: true,
    email: true,
    role: true,
  };

  private readonly consultaInclude = {
    animal: { select: { id: true, nome: true, especie: true, raca: true } },
    veterinario: { select: this.pessoaSelect },
    tratamentos: { orderBy: { createdAt: 'asc' as const } },
  };

  async create(data: CreateConsultaDto, veterinarioId: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id: data.animalId } });

    if (!animal) {
      throw new NotFoundException(
        `Animal com id ${data.animalId} não encontrado. Verifique se o animalId é válido.`,
      );
    }

    return this.prisma.consulta.create({
      data: {
        data: new Date(data.data),
        observacoes: data.observacoes,
        diagnostico: data.diagnostico,
        animalId: data.animalId,
        veterinarioId,
        pesoRegistado: data.pesoRegistado ?? null,
      },
      include: this.consultaInclude,
    });
  }

  async findByAnimal(animalId: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });

    if (!animal) {
      throw new NotFoundException(`Animal com id ${animalId} não encontrado.`);
    }

    return this.prisma.consulta.findMany({
      where: { animalId },
      include: this.consultaInclude,
      orderBy: { data: 'desc' },
    });
  }

  async findOne(id: number) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id },
      include: this.consultaInclude,
    });

    if (!consulta) {
      throw new NotFoundException(`Consulta com id ${id} não encontrada.`);
    }

    return consulta;
  }
}
