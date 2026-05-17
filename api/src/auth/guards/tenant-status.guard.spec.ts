import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { TenantStatusGuard } from './tenant-status.guard';
import { UserRole } from '../auth.types';
import { TenantRepository } from '../../infrastructure/sql-db/repositories/tenant.repository';

function mockContext(
  path: string,
  method: string,
  user: unknown,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ path, method, user }),
    }),
  } as ExecutionContext;
}

describe('TenantStatusGuard', () => {
  it('permite super admin sin consultar tenant', async () => {
    const tenants = { findById: jest.fn() } as unknown as TenantRepository;
    const guard = new TenantStatusGuard(tenants);
    const ok = await guard.canActivate(
      mockContext('/api/tenant/sales', 'GET', {
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
      }),
    );
    expect(ok).toBe(true);
    expect(tenants.findById).not.toHaveBeenCalled();
  });

  it('bloquea tenant PAUSED salvo rutas permitidas', async () => {
    const tenants = {
      findById: jest.fn().mockResolvedValue({
        id: 't1',
        status: 'PAUSED',
      }),
    } as unknown as TenantRepository;
    const guard = new TenantStatusGuard(tenants);

    await expect(
      guard.canActivate(
        mockContext('/api/tenant/sales', 'GET', {
          role: UserRole.ADMIN,
          tenantId: 't1',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      guard.canActivate(
        mockContext('/api/tenant/context', 'GET', {
          role: UserRole.ADMIN,
          tenantId: 't1',
        }),
      ),
    ).resolves.toBe(true);

    await expect(
      guard.canActivate(
        mockContext('/api/tenant/billing/status', 'GET', {
          role: UserRole.ADMIN,
          tenantId: 't1',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('permite tenant ACTIVE', async () => {
    const tenants = {
      findById: jest.fn().mockResolvedValue({ id: 't1', status: 'ACTIVE' }),
    } as unknown as TenantRepository;
    const guard = new TenantStatusGuard(tenants);
    await expect(
      guard.canActivate(
        mockContext('/api/tenant/sales', 'GET', {
          role: UserRole.ADMIN,
          tenantId: 't1',
        }),
      ),
    ).resolves.toBe(true);
  });
});
