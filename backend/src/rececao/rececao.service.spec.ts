import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RececaoService } from './rececao.service';

describe('RececaoService - catálogo de serviços', () => {
  let service: RececaoService;

  const prismaMock = {
    servicoCatalogo: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    marcacao: {
      groupBy: jest.fn(),
    },
    fatura: {
      aggregate: jest.fn(),
    },
    animal: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    const gatewayMock = {
      emitMarcacaoCriada: jest.fn(),
      emitHorarioAtualizado: jest.fn(),
    };
    const auditLogMock = { log: jest.fn().mockResolvedValue(undefined) };

    service = new RececaoService(prismaMock as any, gatewayMock as any, auditLogMock as any);
  });

  it('cria um serviço ativo com campos normalizados', async () => {
    const servico = {
      id: 1,
      nome: 'Consulta Geral',
      categoria: 'Consulta',
      preco: 45,
      descricao: 'Consulta de rotina',
      ativo: true,
    };

    prismaMock.servicoCatalogo.create.mockResolvedValue(servico);

    await expect(
      service.createServico({
        nome: '  Consulta Geral  ',
        categoria: '  Consulta  ',
        preco: 45,
        descricao: '  Consulta de rotina  ',
      }),
    ).resolves.toEqual(servico);

    expect(prismaMock.servicoCatalogo.create).toHaveBeenCalledWith({
      data: {
        nome: 'Consulta Geral',
        categoria: 'Consulta',
        preco: 45,
        descricao: 'Consulta de rotina',
        ativo: true,
      },
    });
  });

  it('rejeita criação com preço inválido', async () => {
    await expect(
      service.createServico({
        nome: 'Consulta Geral',
        categoria: 'Consulta',
        preco: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.servicoCatalogo.create).not.toHaveBeenCalled();
  });

  it('atualiza nome, categoria, preço e descrição', async () => {
    const existing = {
      id: 1,
      nome: 'Consulta',
      categoria: 'Consulta',
      preco: 35,
      descricao: null,
      ativo: true,
    };
    const updated = {
      ...existing,
      nome: 'Consulta Geral',
      categoria: 'Clínica',
      preco: 45,
      descricao: 'Consulta de rotina',
    };

    prismaMock.servicoCatalogo.findUnique.mockResolvedValue(existing);
    prismaMock.servicoCatalogo.update.mockResolvedValue(updated);

    await expect(
      service.updateServico(1, {
        nome: '  Consulta Geral  ',
        categoria: '  Clínica  ',
        preco: 45,
        descricao: '  Consulta de rotina  ',
      }),
    ).resolves.toEqual(updated);

    expect(prismaMock.servicoCatalogo.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nome: 'Consulta Geral',
        categoria: 'Clínica',
        preco: 45,
        descricao: 'Consulta de rotina',
      },
    });
  });

  it('lança NotFoundException ao atualizar serviço inexistente', async () => {
    prismaMock.servicoCatalogo.findUnique.mockResolvedValue(null);

    await expect(
      service.updateServico(999, { nome: 'Consulta Geral' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.servicoCatalogo.update).not.toHaveBeenCalled();
  });

  it('ativa e desativa logicamente um serviço', async () => {
    const existing = {
      id: 1,
      nome: 'Consulta Geral',
      categoria: 'Consulta',
      preco: 45,
      descricao: null,
      ativo: true,
    };
    const toggled = { ...existing, ativo: false };

    prismaMock.servicoCatalogo.findUnique.mockResolvedValue(existing);
    prismaMock.servicoCatalogo.update.mockResolvedValue(toggled);

    await expect(service.toggleServico(1)).resolves.toEqual(toggled);

    expect(prismaMock.servicoCatalogo.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ativo: false },
    });
  });

  it('lista apenas serviços ativos para consumo pela receção', async () => {
    const servicos = [
      {
        id: 1,
        nome: 'Consulta Geral',
        categoria: 'Consulta',
        preco: 45,
        ativo: true,
      },
    ];

    prismaMock.servicoCatalogo.findMany.mockResolvedValue(servicos);

    await expect(service.findServicosAtivos()).resolves.toEqual(servicos);

    expect(prismaMock.servicoCatalogo.findMany).toHaveBeenCalledWith({
      where: { ativo: true },
      orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    });
  });

  it('retorna estatísticas mensais dos últimos 6 meses com meses vazios a zero', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-13T10:00:00.000Z'));

    prismaMock.marcacao.groupBy.mockImplementation(({ where }: any) => {
      const month = where.data.gte.getMonth();

      if (month === 4) {
        return Promise.resolve([
          { estado: 'CONCLUIDA', _count: { _all: 3 } },
          { estado: 'CANCELADA', _count: { _all: 1 } },
          { estado: 'AGENDADA', _count: { _all: 2 } },
        ]);
      }

      return Promise.resolve([]);
    });
    prismaMock.fatura.aggregate.mockImplementation(({ where }: any) => {
      const month = where.dataEmissao.gte.getMonth();

      return Promise.resolve({
        _sum: {
          valor: month === 4 ? 150 : null,
        },
      });
    });
    prismaMock.animal.groupBy.mockResolvedValue([
      { especie: 'Cão', _count: { _all: 8 } },
      { especie: 'Gato', _count: { _all: 4 } },
    ]);

    const result = await service.getMonthlyStats();

    expect(result.marcacoesPorMes).toHaveLength(6);
    expect(result.receitaPorMes).toHaveLength(6);
    expect(result.marcacoesPorMes[0]).toEqual({
      mes: '2025-12',
      total: 0,
      concluidas: 0,
      canceladas: 0,
    });
    expect(result.marcacoesPorMes[5]).toEqual({
      mes: '2026-05',
      total: 6,
      concluidas: 3,
      canceladas: 1,
    });
    expect(result.receitaPorMes[5]).toEqual({
      mes: '2026-05',
      receita: 150,
    });
    expect(result.distribuicaoEspecie).toEqual([
      { especie: 'Cão', total: 8 },
      { especie: 'Gato', total: 4 },
    ]);
  });

  it('calcula receita mensal apenas com faturas pagas', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-13T10:00:00.000Z'));

    prismaMock.marcacao.groupBy.mockResolvedValue([]);
    prismaMock.fatura.aggregate.mockResolvedValue({ _sum: { valor: 0 } });
    prismaMock.animal.groupBy.mockResolvedValue([]);

    await service.getMonthlyStats();

    expect(prismaMock.fatura.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: 'PAGA',
        }),
        _sum: {
          valor: true,
        },
      }),
    );
  });

  it('retorna top 5 motivos de marcação', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-13T10:00:00.000Z'));

    prismaMock.marcacao.groupBy.mockImplementation(({ by, take }: any) => {
      if (by.includes('motivo')) {
        expect(take).toBe(5);
        return Promise.resolve([
          { motivo: 'Consulta', _count: { _all: 10 } },
          { motivo: 'Vacinação', _count: { _all: 6 } },
        ]);
      }

      return Promise.resolve([]);
    });
    prismaMock.fatura.aggregate.mockResolvedValue({ _sum: { valor: 0 } });
    prismaMock.animal.groupBy.mockResolvedValue([]);

    const result = await service.getMonthlyStats();

    expect(result.topMotivos).toEqual([
      { motivo: 'Consulta', total: 10 },
      { motivo: 'Vacinação', total: 6 },
    ]);
  });
});

