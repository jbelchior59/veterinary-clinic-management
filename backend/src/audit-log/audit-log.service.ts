import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        acao: dto.acao,
        entidade: dto.entidade,
        entidadeId: dto.entidadeId ?? null,
        detalhes: dto.detalhes ?? null,
        userId: dto.userId ?? null,
      },
    });
  }

  async findAll(entidade?: string, userId?: number) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entidade ? { entidade } : {}),
        ...(userId ? { userId } : {}),
      },
      include: { user: { select: { id: true, nome: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
