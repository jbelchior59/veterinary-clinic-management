import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [transactions, paidInvoices] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fatura.aggregate({
        where: { estado: 'PAGA' },
        _sum: { valor: true },
      }),
    ]);

    const lucrosMap = new Map<string, number>();
    const despesasMap = new Map<string, number>();
    const paidInvoicesTotal = paidInvoices._sum.valor ?? 0;

    if (paidInvoicesTotal > 0) {
      lucrosMap.set('Faturas pagas', paidInvoicesTotal);
    }

    for (const transaction of transactions) {
      const target = transaction.tipo === 'LUCRO' ? lucrosMap : despesasMap;

      target.set(
        transaction.categoria,
        (target.get(transaction.categoria) ?? 0) + transaction.valor,
      );
    }

    const lucros = Array.from(lucrosMap.entries()).map(
      ([categoria, valor]) => ({
        categoria,
        valor,
      }),
    );

    const despesas = Array.from(despesasMap.entries()).map(
      ([categoria, valor]) => ({
        categoria,
        valor,
      }),
    );

    const totalLucros = lucros.reduce((sum, item) => sum + item.valor, 0);
    const totalDespesas = despesas.reduce((sum, item) => sum + item.valor, 0);

    return {
      totalLucros,
      totalDespesas,
      balanco: totalLucros - totalDespesas,
      lucros,
      despesas,
    };
  }

  async create(data: {
    tipo: 'LUCRO' | 'DESPESA';
    categoria: string;
    valor: number;
    descricao?: string;
  }) {
    return this.prisma.financialTransaction.create({
      data: {
        tipo: data.tipo,
        categoria: data.categoria,
        valor: Number(data.valor),
        descricao: data.descricao ?? null,
      },
    });
  }
}
