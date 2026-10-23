import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonoDto } from './dto/create-dono.dto';
import { UpdateDonoDto } from './dto/update-dono.dto';

@Injectable()
export class DonoService {

  constructor(private prisma: PrismaService) {}

  async create(data: CreateDonoDto) {
    try {
      return await this.prisma.dono.create({ data });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Email já está em uso');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.dono.findMany({
      include: { animais: true }
    });
  }

  async findOne(id: number) {
    const dono = await this.prisma.dono.findUnique({
      where: { id },
      include: { animais: true }
    });

    if (!dono) {
      throw new NotFoundException('Dono não encontrado');
    }

    return dono;
  }

  async update(id: number, data: UpdateDonoDto) {

    await this.findOne(id);

    return this.prisma.dono.update({
      where: { id },
      data
    });
  }

  async remove(id: number) {

    const dono = await this.prisma.dono.findUnique({
      where: { id },
      include: { animais: true }
    });

    if (!dono) {
      throw new NotFoundException('Dono não encontrado');
    }

    if (dono.animais.length > 0) {
      throw new BadRequestException(
        'Não é possível remover um dono com animais associados'
      );
    }

    return this.prisma.dono.delete({
      where: { id }
    });
  }
}