import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const auditLogMock = { log: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prismaMock as any, auditLogMock as any);
  });

  it('altera password com hash bcrypt', async () => {
    const user = {
      id: 2,
      nome: 'Ana',
      email: 'ana@clinica.pt',
      role: 'VETERINARIO',
      createdAt: new Date('2026-01-01'),
    };

    prismaMock.user.findUnique.mockResolvedValue(user);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prismaMock.user.update.mockResolvedValue(user);

    await expect(service.updatePassword(2, 'nova-password')).resolves.toEqual(
      user,
    );

    expect(bcrypt.hash).toHaveBeenCalledWith('nova-password', 10);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { password: 'hashed-password' },
      select: expect.objectContaining({
        id: true,
        email: true,
      }),
    });
  });

  it('impede eliminar o proprio utilizador', async () => {
    await expect(service.remove(1, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });
});
