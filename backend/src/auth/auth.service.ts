import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, role: true },
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    let passwordValid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      passwordValid = await bcrypt.compare(loginDto.password, user.password);
    } else {
      passwordValid = loginDto.password === user.password;
      if (passwordValid) {
        const hashedPassword = await bcrypt.hash(loginDto.password, 10);
        await this.prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
      }
    }

    if (!passwordValid) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id, nome: user.nome, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role, createdAt: user.createdAt },
    };
  }
}
