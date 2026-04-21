import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser, AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantService } from './tenant.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLEADO)
@Systems(AppSystem.TENANT)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('context')
  getTenantContext(@Req() req: AuthenticatedRequest) {
    return this.tenantService.getTenantContext(req.user);
  }
}
