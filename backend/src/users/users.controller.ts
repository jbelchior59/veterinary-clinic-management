import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @Roles()
  getMe(@CurrentUser() user: any) {
    return this.usersService.findOne(user.userId);
  }

  @Patch('me')
  @Roles()
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      email: string;
      password: string;
      nome?: string;
      role: Role;
    },
  ) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      email?: string;
      password?: string;
      nome?: string;
      role?: Role;
    },
  ) {
    return this.usersService.update(id, body);
  }

  @Patch(':id/password')
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserPasswordDto,
  ) {
    return this.usersService.updatePassword(id, body.newPassword);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.usersService.remove(id, user?.userId);
  }
}
