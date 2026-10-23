import { Test, TestingModule } from '@nestjs/testing';
import { DonoService } from './dono.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  dono: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('DonoService', () => {
  let service: DonoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DonoService>(DonoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});