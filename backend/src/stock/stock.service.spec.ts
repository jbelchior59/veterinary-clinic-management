import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StockService', () => {
  let service: StockService;

  const prismaMock = {
    stockItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    stockMovimento: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(async (operationsOrCallback: any) => {
      if (typeof operationsOrCallback === 'function') {
        return operationsOrCallback(prismaMock);
      }

      return Promise.all(operationsOrCallback);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  it('should create a stock item', async () => {
    const dto = {
      nome: 'Seringa',
      categoria: 'Consumíveis',
      quantidade: 10,
      stockMinimo: 5,
      unidade: 'un',
    };

    const createdItem = {
      id: 1,
      ...dto,
    };

    prismaMock.stockItem.create.mockResolvedValue(createdItem);

    await expect(service.create(dto as any)).resolves.toMatchObject({
      id: 1,
      nome: 'Seringa',
      categoria: 'Consumíveis',
      quantidade: 10,
      unidade: 'un',
      baixoStock: false,
      expirado: false,
      validadeProxima: false,
      status: 'OK',
    });

    expect(prismaMock.stockItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nome: 'Seringa',
          categoria: 'Consumíveis',
          quantidade: 10,
          quantidadeMin: 0,
          unidade: 'un',
          fornecedor: null,
          localizacao: null,
          lote: null,
          notas: null,
          validade: null,
        }),
      }),
    );
  });

  it('should add entrada and increment quantidade', async () => {
    const item = {
      id: 1,
      nome: 'Seringa',
      quantidade: 10,
      quantidadeMin: 5,
      unidade: 'un',
      categoria: 'Consumíveis',
    };

    const updatedItem = {
      ...item,
      quantidade: 15,
    };

    prismaMock.stockItem.findUnique.mockResolvedValue(item);
    prismaMock.stockMovimento.create.mockResolvedValue({
      id: 1,
      stockItemId: 1,
      tipo: 'ENTRADA',
      quantidade: 5,
    });
    prismaMock.stockItem.update.mockResolvedValue(updatedItem);

    await expect(
      service.addEntrada(1, { quantidade: 5, motivo: 'Reposição' } as any),
    ).resolves.toBeDefined();

    expect(prismaMock.stockItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          quantidade: 15,
        },
      }),
    );
  });

  it('should register consumo and decrement quantidade', async () => {
    const item = {
      id: 1,
      nome: 'Seringa',
      quantidade: 10,
      quantidadeMin: 5,
      unidade: 'un',
      categoria: 'Consumíveis',
    };

    const updatedItem = {
      ...item,
      quantidade: 6,
    };

    prismaMock.stockItem.findUnique.mockResolvedValue(item);
    prismaMock.stockMovimento.create.mockResolvedValue({
      id: 1,
      stockItemId: 1,
      tipo: 'SAIDA',
      quantidade: 4,
    });
    prismaMock.stockItem.update.mockResolvedValue(updatedItem);

    await expect(
      service.registarConsumo(1, { quantidade: 4, motivo: 'Consulta' } as any),
    ).resolves.toBeDefined();

    expect(prismaMock.stockItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          quantidade: 6,
        },
      }),
    );
  });

  it('should throw BadRequestException when consumo quantity is insufficient', async () => {
    prismaMock.stockItem.findUnique.mockResolvedValue({
      id: 1,
      nome: 'Seringa',
      quantidade: 2,
      quantidadeMin: 5,
      unidade: 'un',
      categoria: 'Consumíveis',
    });

    await expect(
      service.registarConsumo(1, { quantidade: 5, motivo: 'Consulta' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.stockItem.update).not.toHaveBeenCalled();
    expect(prismaMock.stockMovimento.create).not.toHaveBeenCalled();
  });

  it('should get stock alerts', async () => {
    const today = new Date('2026-05-13T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(today);

    const items = [
      {
        id: 1,
        nome: 'Seringa',
        categoria: 'Consumíveis',
        quantidade: 3,
        quantidadeMin: 5,
        unidade: 'un',
        validade: null,
      },
      {
        id: 2,
        nome: 'Luvas',
        categoria: 'Consumíveis',
        quantidade: 20,
        quantidadeMin: 5,
        unidade: 'cx',
        validade: null,
      },
    ];

    prismaMock.stockItem.findMany.mockResolvedValue(items);

    const result = await service.getAlertas();

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          nome: 'Seringa',
          baixoStock: true,
        }),
      ]),
    );

    expect(result).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 2,
          nome: 'Luvas',
        }),
      ]),
    );

    expect(prismaMock.stockItem.findMany).toHaveBeenCalled();
  });
});