import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser, AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('tenant/tienda-registros')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLEADO)
@Systems(AppSystem.TENANT)
export class TenantStoreVisitsController {
  constructor(private readonly sqlDb: SqlDbService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin tenant');
    }
    const tenant = this.sqlDb.findTenantById(user.tenantId);
    if (!tenant?.modules.ventas) {
      throw new ForbiddenException('El modulo de ventas no esta activo para este tenant');
    }
    return this.sqlDb.listStoreVisitsByTenantId(user.tenantId);
  }
}
