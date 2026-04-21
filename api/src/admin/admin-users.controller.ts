import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminUsersController {
  constructor(private readonly sqlDbService: SqlDbService) {}

  @Get()
  listUsers() {
    return this.sqlDbService.listUsers().map((user) => {
      const { password: _password, ...safeUser } = user;
      return safeUser;
    });
  }

  @Get(':userId')
  getUserById(@Param('userId') userId: string) {
    const user = this.sqlDbService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  @Post()
  createUser(@Body() body: CreateUserDto) {
    const created = this.sqlDbService.createUser({
      id: body.id,
      email: body.email,
      password: body.password,
      role: body.role,
      tenantId: body.tenantId ?? null,
      systems: body.systems,
      status: body.status,
    });

    const { password: _password, ...safeUser } = created;
    return safeUser;
  }

  @Patch(':userId')
  updateUser(@Param('userId') userId: string, @Body() body: UpdateUserDto) {
    const updated = this.sqlDbService.updateUser(userId, {
      email: body.email,
      password: body.password,
      role: body.role,
      tenantId: body.tenantId,
      systems: body.systems,
      status: body.status,
    });
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { password: _password, ...safeUser } = updated;
    return safeUser;
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('userId') userId: string) {
    const deleted = this.sqlDbService.deleteUser(userId);
    if (!deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}
