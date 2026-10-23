import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { CreateStockMovimentoDto } from './dto/create-stock-movimento.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // Getter para contornar tipos do Prisma não regenerados (stockItem, stockMovimento)
  private get db(): any {
    return this.prisma;
  }

  private readonly pessoaSelect = {
    id: true,
    nome: true,
    email: true,
    role: true,
  };

  private readonly itemInclude = {
    movimentos: {
      orderBy: { createdAt: 'desc' as const },
      take: 20,
      include: { registadoPor: { select: this.pessoaSelect } },
    },
  };

  async findAll() {
    const items = await this.db.stockItem.findMany({
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
      include: this.itemInclude,
    });

    return items.map((item) => this.withStatus(item));
  }

  async getAlertas() {
    const items = await this.db.stockItem.findMany({
      orderBy: [{ validade: 'asc' }, { quantidade: 'asc' }],
      include: this.itemInclude,
    });

    return items
      .map((item) => this.withStatus(item))
      .filter((item) => item.status !== 'OK');
  }

  async create(dto: CreateStockItemDto) {
    const item = await this.db.stockItem.create({
      data: {
        nome: dto.nome.trim(),
        categoria: dto.categoria.trim(),
        unidade: dto.unidade.trim(),
        quantidade: dto.quantidade ?? 0,
        quantidadeMin: dto.quantidadeMin ?? 0,
        lote: dto.lote?.trim() || null,
        validade: dto.validade ? new Date(dto.validade) : null,
        localizacao: dto.localizacao?.trim() || null,
        fornecedor: dto.fornecedor?.trim() || null,
        notas: dto.notas?.trim() || null,
      },
      include: this.itemInclude,
    });

    return this.withStatus(item);
  }

  async update(id: number, dto: UpdateStockItemDto) {
    await this.ensureItemExists(id);

    const item = await this.db.stockItem.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome.trim() } : {}),
        ...(dto.categoria !== undefined
          ? { categoria: dto.categoria.trim() }
          : {}),
        ...(dto.unidade !== undefined ? { unidade: dto.unidade.trim() } : {}),
        ...(dto.quantidade !== undefined ? { quantidade: dto.quantidade } : {}),
        ...(dto.quantidadeMin !== undefined
          ? { quantidadeMin: dto.quantidadeMin }
          : {}),
        ...(dto.lote !== undefined ? { lote: dto.lote?.trim() || null } : {}),
        ...(dto.validade !== undefined
          ? { validade: dto.validade ? new Date(dto.validade) : null }
          : {}),
        ...(dto.localizacao !== undefined
          ? { localizacao: dto.localizacao?.trim() || null }
          : {}),
        ...(dto.fornecedor !== undefined
          ? { fornecedor: dto.fornecedor?.trim() || null }
          : {}),
        ...(dto.notas !== undefined
          ? { notas: dto.notas?.trim() || null }
          : {}),
      },
      include: this.itemInclude,
    });

    return this.withStatus(item);
  }

  addEntrada(
    id: number,
    dto: CreateStockMovimentoDto,
    registadoPorId?: number,
  ) {
    return this.registarMovimento(id, 'ENTRADA', dto, registadoPorId);
  }

  registarConsumo(
    id: number,
    dto: CreateStockMovimentoDto,
    registadoPorId?: number,
  ) {
    return this.registarMovimento(id, 'CONSUMO', dto, registadoPorId);
  }

  private async registarMovimento(
    itemId: number,
    tipo: 'ENTRADA' | 'CONSUMO',
    dto: CreateStockMovimentoDto,
    registadoPorId?: number,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await (tx as any).stockItem.findUnique({ where: { id: itemId } });
      if (!item)
        throw new NotFoundException(
          `Item de stock com id ${itemId} nao encontrado`,
        );

      const novaQuantidade =
        tipo === 'ENTRADA'
          ? item.quantidade + dto.quantidade
          : item.quantidade - dto.quantidade;

      if (novaQuantidade < 0) {
        throw new BadRequestException(
          'Stock insuficiente para registar consumo.',
        );
      }

      await (tx as any).stockMovimento.create({
        data: {
          itemId,
          tipo,
          quantidade: dto.quantidade,
          motivo: dto.motivo?.trim() || null,
          registadoPorId: registadoPorId ?? null,
        },
      });

      return (tx as any).stockItem.update({
        where: { id: itemId },
        data: { quantidade: novaQuantidade },
        include: this.itemInclude,
      });
    });

    return this.withStatus(updated);
  }

  async getMovimentos(id: number) {
    await this.ensureItemExists(id);

    return this.db.stockMovimento.findMany({
      where: { itemId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        registadoPor: { select: this.pessoaSelect },
        item: true,
      },
    });
  }

  private async ensureItemExists(id: number) {
    const item = await this.db.stockItem.findUnique({ where: { id } });
    if (!item)
      throw new NotFoundException(`Item de stock com id ${id} nao encontrado`);
    return item;
  }

  private validadeLimite30Dias() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }

  private withStatus<
    T extends {
      quantidade: number;
      quantidadeMin: number;
      validade: Date | null;
    },
  >(item: T) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = this.validadeLimite30Dias();
    limite.setHours(23, 59, 59, 999);

    const baixoStock = item.quantidade <= item.quantidadeMin;
    const validadeProxima = item.validade
      ? item.validade >= hoje && item.validade <= limite
      : false;
    const expirado = item.validade ? item.validade < hoje : false;

    return {
      ...item,
      baixoStock,
      validadeProxima,
      expirado,
      status: baixoStock
        ? 'BAIXO_STOCK'
        : expirado
          ? 'EXPIRADO'
          : validadeProxima
            ? 'VALIDADE_PROXIMA'
            : 'OK',
    };
  }
}
