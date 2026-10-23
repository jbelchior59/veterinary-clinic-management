import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotaRapidaDto } from './dto/create-nota-rapida.dto';

@Injectable()
export class NotaRapidaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotaRapidaDto, autorId?: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id: dto.animalId } });
    if (!animal) {
      throw new BadRequestException(`Animal com id ${dto.animalId} não encontrado`);
    }

    return this.prisma.notaRapida.create({
      data: {
        texto: dto.texto,
        animalId: dto.animalId,
        autorId: autorId ?? null,
      },
      include: {
        animal: { select: { id: true, nome: true } },
        autor: { select: { id: true, nome: true, email: true } },
      },
    });
  }

  async findByAnimal(animalId: number) {
    const animal = await this.prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundException(`Animal com id ${animalId} não encontrado`);
    }

    return this.prisma.notaRapida.findMany({
      where: { animalId },
      include: {
        autor: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: number, actorId?: number, actorRole?: string) {
    const nota = await this.prisma.notaRapida.findUnique({ where: { id } });
    if (!nota) {
      throw new NotFoundException(`Nota rápida com id ${id} não encontrada`);
    }

    if (actorRole !== 'ADMIN' && nota.autorId !== null && nota.autorId !== actorId) {
      throw new ForbiddenException('Só podes eliminar notas que criaste.');
    }

    return this.prisma.notaRapida.delete({ where: { id } });
  }
}
