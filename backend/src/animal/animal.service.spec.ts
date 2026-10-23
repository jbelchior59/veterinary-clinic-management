import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrismaService = {
  animal: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  dono: {
    findUnique: jest.fn(),
  },
};

describe('AnimalService', () => {
  let service: AnimalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<AnimalService>(AnimalService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHistorico', () => {
    const mockAnimal = {
      id: 1,
      nome: 'Rex',
      especie: 'Cão',
      donoId: 1,
      consultas: [
        {
          id: 1,
          data: new Date('2026-01-10T10:00:00Z'),
          observacoes: 'Animal prostrado',
          diagnostico: 'Infeção respiratória',
          createdAt: new Date('2026-01-10T10:30:00Z'),
          tratamentos: [
            {
              id: 1,
              descricao: 'Antibioterapia',
              medicacao: 'Amoxicilina 250mg',
              createdAt: new Date('2026-01-10T10:35:00Z'),
            },
          ],
        },
        {
          id: 2,
          data: new Date('2026-02-15T09:00:00Z'),
          observacoes: 'Revisão pós-tratamento',
          diagnostico: 'Recuperado',
          createdAt: new Date('2026-02-15T09:20:00Z'),
          tratamentos: [],
        },
      ],
    };

    it('deve devolver o histórico com consultas e tratamentos ordenados', async () => {
      mockPrismaService.animal.findUnique.mockResolvedValue(mockAnimal);

      const resultado = await service.getHistorico(1);

      expect(mockPrismaService.animal.findUnique).toHaveBeenCalledWith({
  where: { id: 1 },
  include: {
    dono: true,
    consultas: {
      orderBy: { data: 'desc' },
      include: {
        tratamentos: {
          orderBy: { createdAt: 'desc' },
        },
      },
    },
    marcacoes: {
      orderBy: { data: 'desc' },
    },
  },
});

      expect(resultado.animalId).toBe(1);
      expect(resultado.nome).toBe('Rex');
      expect(resultado.totalConsultas).toBe(2);
      expect(resultado.consultas).toHaveLength(2);
    });

    it('deve mapear corretamente os campos de cada consulta', async () => {
      mockPrismaService.animal.findUnique.mockResolvedValue(mockAnimal);

      const resultado = await service.getHistorico(1);
      const primeiraConsulta = resultado.consultas[0];

      expect(primeiraConsulta.id).toBe(1);
      expect(primeiraConsulta.observacoes).toBe('Animal prostrado');
      expect(primeiraConsulta.diagnostico).toBe('Infeção respiratória');
      expect(primeiraConsulta.tratamentos).toHaveLength(1);
      expect(primeiraConsulta.tratamentos[0].descricao).toBe('Antibioterapia');
      expect(primeiraConsulta.tratamentos[0].medicacao).toBe('Amoxicilina 250mg');
    });

    it('deve devolver lista vazia de tratamentos quando consulta não tem tratamentos', async () => {
      mockPrismaService.animal.findUnique.mockResolvedValue(mockAnimal);

      const resultado = await service.getHistorico(1);

      expect(resultado.consultas[1].tratamentos).toHaveLength(0);
    });

    it('deve lançar NotFoundException quando o animal não existe', async () => {
      mockPrismaService.animal.findUnique.mockResolvedValue(null);

      await expect(service.getHistorico(999)).rejects.toThrow(NotFoundException);
      await expect(service.getHistorico(999)).rejects.toThrow(
        'Animal com id 999 não encontrado',
      );
    });

    it('deve devolver totalConsultas = 0 quando o animal não tem consultas', async () => {
      mockPrismaService.animal.findUnique.mockResolvedValue({
        ...mockAnimal,
        consultas: [],
      });

      const resultado = await service.getHistorico(1);

      expect(resultado.totalConsultas).toBe(0);
      expect(resultado.consultas).toHaveLength(0);
    });
  });
});