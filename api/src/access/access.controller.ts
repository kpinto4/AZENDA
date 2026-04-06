import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AppSystem, AuthUser, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessController {
  @Get('admin/ping')
  @Roles(UserRole.SUPER_ADMIN)
  @Systems(AppSystem.SUPER_ADMIN)
  adminPing(@Req() req: AuthenticatedRequest) {
    return {
      ok: true,
      area: 'admin',
      userId: req.user.id,
      role: req.user.role,
    };
  }

  @Get('tenant/ping')
  @Roles(UserRole.ADMIN, UserRole.EMPLEADO)
  @Systems(AppSystem.TENANT)
  tenantPing(@Req() req: AuthenticatedRequest) {
    return {
      ok: true,
      area: 'tenant',
      userId: req.user.id,
      tenantId: req.user.tenantId,
      role: req.user.role,
    };
  }
}
