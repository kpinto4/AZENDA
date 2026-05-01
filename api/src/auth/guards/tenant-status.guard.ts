import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser, UserRole } from '../auth.types';
import { SqlDbService } from '../../infrastructure/sql-db/sql-db.service';

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly sqlDb: SqlDbService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (!user || user.role === UserRole.SUPER_ADMIN || !user.tenantId) {
      return true;
    }

    // Permite contexto para mostrar aviso en el panel.
    if (req.method === 'GET' && req.path.endsWith('/tenant/context')) {
      return true;
    }

    const tenant = await this.sqlDb.findTenantById(user.tenantId);
    if (!tenant) {
      throw new ForbiddenException('Tenant no disponible');
    }
    if (tenant.status === 'ACTIVE') {
      return true;
    }

    const statusLabel = tenant.status === 'PAUSED' ? 'PAUSADO' : 'BLOQUEADO';
    throw new ForbiddenException(
      `Tu negocio esta ${statusLabel}. Contacta a soporte o a tu administrador para reactivarlo.`,
    );
  }
}

