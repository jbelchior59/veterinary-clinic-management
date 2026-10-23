import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar utilizador e obter JWT' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'JWT gerado com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter perfil do utilizador autenticado' })
  @ApiOkResponse({ description: 'Perfil devolvido com sucesso.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou em falta.' })
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.userId);
  }
}
