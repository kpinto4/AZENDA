import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser, UserRole } from '../auth.types';
import { TenantRepository } from '../../infrastructure/sql-db/repositories/tenant.repository';

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly tenants: TenantRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (!user || user.role === UserRole.SUPER_ADMIN || !user.tenantId) {
      return true;
    }

    // Permite endpoints de contexto/facturacion para informar restricciones aun estando pausado.
    const isAllowedInRestrictedTenant =
      (req.method === 'GET' && req.path.endsWith('/tenant/context')) ||
      (req.method === 'GET' && req.path.endsWith('/tenant/billing/status')) ||
      (req.method === 'POST' &&
        req.path.endsWith('/tenant/billing/upgrade-quote'));
    if (isAllowedInRestrictedTenant) {
      return true;
    }

    const tenant = await this.tenants.findById(user.tenantId);
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
