import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VacinaService } from './vacina.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VacinaService', () => {
  let service: VacinaService;

  const prismaMock = {
    animal: {
      findUnique: jest.fn(),
    },
    vacina: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VacinaService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<VacinaService>(VacinaService);
  });

  it('should create a vacina', async () => {
    const dto = {
      animalId: 1,
      nome: 'Raiva',
      dataAplicacao: new Date('2026-01-10'),
      proximaDose: new Date('2026-07-10'),
    };

    const animal = {
      id: 1,
      nome: 'Bobi',
    };

    const createdVacina = {
      id: 1,
      ...dto,
      aplicadoPorId: 1,
    };

    prismaMock.animal.findUnique.mockResolvedValue(animal);
    prismaMock.vacina.create.mockResolvedValue(createdVacina);

    await expect(service.create(dto as any, 1)).resolves.toEqual(createdVacina);

    expect(prismaMock.animal.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    expect(prismaMock.vacina.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ...dto,
          aplicadoPorId: 1,
          fabricante: null,
          lote: null,
          observacoes: null,
        }),
      }),
    );
  });

  it('should return vacinas by animal ordered by application date descending', async () => {
    const animal = {
      id: 1,
      nome: 'Bobi',
    };

    const vacinas = [
      {
        id: 2,
        animalId: 1,
        nome: 'Leishmaniose',
        dataAplicacao: new Date('2026-03-10'),
      },
      {
        id: 1,
        animalId: 1,
        nome: 'Raiva',
        dataAplicacao: new Date('2026-01-10'),
      },
    ];

    prismaMock.animal.findUnique.mockResolvedValue(animal);
    prismaMock.vacina.findMany.mockResolvedValue(vacinas);

    await expect(service.findByAnimal(1)).resolves.toEqual(vacinas);

    expect(prismaMock.animal.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    expect(prismaMock.vacina.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { animalId: 1 },
        orderBy: { dataAplicacao: 'desc' },
      }),
    );
  });

  it('should find alerts for upcoming doses filtered by date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-13T10:00:00.000Z'));

    const alertas = [
      {
        id: 1,
        animalId: 1,
        nome: 'Raiva',
        proximaDose: new Date('2026-05-20T00:00:00.000Z'),
      },
    ];

    prismaMock.vacina.findMany.mockResolvedValue(alertas);

    await expect(service.findAlertasProximasDoses()).resolves.toEqual(alertas);

    expect(prismaMock.vacina.findMany).toHaveBeenCalledTimes(1);

    const call = prismaMock.vacina.findMany.mock.calls[0][0];

    expect(call.where.proximaDose.gte).toEqual(new Date('2026-05-13T10:00:00.000Z'));
    expect(call.where.proximaDose.lte).toEqual(new Date('2026-06-12T10:00:00.000Z'));
    expect(call.orderBy).toEqual({ proximaDose: 'asc' });
  });

  it('should remove a vacina', async () => {
    const vacina = {
      id: 1,
      animalId: 1,
      nome: 'Raiva',
    };

    prismaMock.vacina.findUnique.mockResolvedValue(vacina);
    prismaMock.vacina.delete.mockResolvedValue(vacina);

    await expect(service.remove(1)).resolves.toEqual(vacina);

    expect(prismaMock.vacina.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    expect(prismaMock.vacina.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it('should throw NotFoundException when removing a vacina that does not exist', async () => {
    prismaMock.vacina.findUnique.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.vacina.delete).not.toHaveBeenCalled();
  });
});