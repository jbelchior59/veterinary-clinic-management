import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTratamentoDto } from './dto/create-tratamento.dto';
import { UpdateTratamentoDto } from './dto/update-tratamento.dto';
import { TratamentoMapper } from './tratamento.mapper';

@Injectable()
export class TratamentoService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTratamentoDto) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id: dto.consultaId },
    });

    if (!consulta) {
      throw new NotFoundException(`Consulta com id ${dto.consultaId} não encontrada.`);
    }

    const tratamento = await this.prisma.tratamento.create({
      data: {
        descricao: dto.descricao,
        medicacao: dto.medicacao,
        consulta: { connect: { id: dto.consultaId } },
      },
      include: { consulta: true },
    });

    return TratamentoMapper.toResponse(tratamento);
  }

  async update(id: number, dto: UpdateTratamentoDto) {
    const existing = await this.prisma.tratamento.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Tratamento com id ${id} não encontrado.`);
    }

    // Só actualiza os campos presentes no payload — evita sobrescrever com undefined
    const data: { descricao?: string; medicacao?: string | null } = {};

    if (dto.descricao !== undefined) {
      data.descricao = dto.descricao;
    }

    if (dto.medicacao !== undefined) {
      data.medicacao = dto.medicacao ?? null;
    }

    const updated = await this.prisma.tratamento.update({
      where: { id },
      data,
      include: { consulta: true },
    });

    return TratamentoMapper.toResponse(updated);
  }
}