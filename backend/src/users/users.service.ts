import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import * as bcrypt from 'bcryptjs';

const USER_SELECT = {
  id: true,
  nome: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: USER_SELECT,
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    return user;
  }

  async create(data: {
    email: string;
    password: string;
    nome?: string;
    role: string;
  }) {
    if (!data.email || !data.password || !data.role) {
      throw new BadRequestException('Email, password e role são obrigatórios.');
    }

    const email = data.email.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Já existe um utilizador com esse email.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nome: data.nome?.trim() || null,
        role: data.role,
      },
      select: USER_SELECT,
    });

    void this.auditLog.log({ acao: 'CRIAR', entidade: 'USER', entidadeId: user.id, detalhes: `role: ${user.role}` });
    return user;
  }

  async update(
    id: number,
    data: {
      email?: string;
      password?: string;
      nome?: string;
      role?: string;
    },
  ) {
    await this.findOne(id);

    const updateData: {
      email?: string;
      password?: string;
      nome?: string | null;
      role?: string;
    } = {};

    if (typeof data.email !== 'undefined') {
      const email = data.email.trim();

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Já existe um utilizador com esse email.');
      }

      updateData.email = email;
    }

    if (typeof data.nome !== 'undefined') {
      updateData.nome = data.nome?.trim() || null;
    }

    if (typeof data.role !== 'undefined') {
      updateData.role = data.role;
    }

    if (typeof data.password !== 'undefined' && data.password.trim() !== '') {
      if (data.password.length < 6) {
        throw new BadRequestException(
          'A password deve ter pelo menos 6 caracteres.',
        );
      }

      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });

    void this.auditLog.log({ acao: 'ATUALIZAR', entidade: 'USER', entidadeId: id });
    return updated;
  }

  async updateMe(userId: number, dto: { nome?: string; newPassword?: string }) {
    const updateData: { nome?: string | null; password?: string } = {};

    if (typeof dto.nome !== 'undefined') {
      updateData.nome = dto.nome?.trim() || null;
    }

    if (dto.newPassword) {
      updateData.password = await bcrypt.hash(dto.newPassword, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: USER_SELECT,
    });

    void this.auditLog.log({ acao: 'ATUALIZAR_PERFIL', entidade: 'USER', entidadeId: userId, userId });
    return updated;
  }

  async updatePassword(id: number, newPassword: string) {
    await this.findOne(id);

    if (!newPassword?.trim() || newPassword.length < 6) {
      throw new BadRequestException(
        'A password deve ter pelo menos 6 caracteres.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: USER_SELECT,
    });
  }

  async remove(id: number, currentUserId?: number) {
    if (currentUserId === id) {
      throw new ForbiddenException('Nao podes eliminar a tua propria conta.');
    }

    await this.findOne(id);

    const deleted = await this.prisma.user.delete({
      where: { id },
      select: USER_SELECT,
    });

    void this.auditLog.log({ acao: 'ELIMINAR', entidade: 'USER', entidadeId: id, userId: currentUserId });
    return deleted;
  }
}
