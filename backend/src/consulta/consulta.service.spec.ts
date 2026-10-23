import { Test, TestingModule } from '@nestjs/testing';
import { ConsultaService } from './consulta.service';
import { PrismaService } from '../prisma/prisma.service';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockPrismaService = {
  animal: {
    findUnique: jest.fn(),
  },
  consulta: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('ConsultaService', () => {
  let service: ConsultaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ConsultaService>(ConsultaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});