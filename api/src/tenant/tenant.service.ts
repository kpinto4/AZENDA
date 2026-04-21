import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, UserRole } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';

@Injectable()
export class TenantService {
  constructor(private readonly sqlDbService: SqlDbService) {}

  getTenantContext(currentUser: AuthUser) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return {
        tenant: null,
        message: 'Super admin sin tenant fijo',
      };
    }

    if (!currentUser.tenantId) {
      throw new NotFoundException('Usuario sin tenant asignado');
    }

    const tenant = this.sqlDbService.findTenantById(currentUser.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return { tenant };
  }
}
