import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppSystem, AuthUser, UserRole } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SYSTEMS_KEY } from '../decorators/systems.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  const makeContext = (user?: AuthUser): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite cuando no hay restricciones', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return undefined;
      if (key === SYSTEMS_KEY) return undefined;
      return undefined;
    });

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('rechaza cuando falta usuario autenticado y hay restricciones', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [UserRole.ADMIN];
      if (key === SYSTEMS_KEY) return undefined;
      return undefined;
    });

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      new ForbiddenException('Usuario no autenticado'),
    );
  });

  it('rechaza por rol incorrecto', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [UserRole.SUPER_ADMIN];
      if (key === SYSTEMS_KEY) return undefined;
      return undefined;
    });

    const user: AuthUser = {
      id: 'usr_2',
      email: 'empleado@azenda.dev',
      password: 'secret',
      role: UserRole.EMPLEADO,
      tenantId: 'tenant_1',
      systems: [AppSystem.TENANT],
      status: 'ACTIVE',
    };

    expect(() => guard.canActivate(makeContext(user))).toThrow(
      new ForbiddenException('No tienes permisos por rol'),
    );
  });

  it('rechaza cuando falta sistema requerido', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [UserRole.ADMIN];
      if (key === SYSTEMS_KEY) return [AppSystem.SUPER_ADMIN];
      return undefined;
    });

    const user: AuthUser = {
      id: 'usr_3',
      email: 'admin@azenda.dev',
      password: 'secret',
      role: UserRole.ADMIN,
      tenantId: 'tenant_1',
      systems: [AppSystem.TENANT],
      status: 'ACTIVE',
    };

    expect(() => guard.canActivate(makeContext(user))).toThrow(
      new ForbiddenException('No tienes acceso a este sistema'),
    );
  });

  it('permite cuando rol y sistemas coinciden', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === ROLES_KEY) return [UserRole.ADMIN];
      if (key === SYSTEMS_KEY) return [AppSystem.TENANT];
      return undefined;
    });

    const user: AuthUser = {
      id: 'usr_4',
      email: 'admin@azenda.dev',
      password: 'secret',
      role: UserRole.ADMIN,
      tenantId: 'tenant_1',
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    };

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });
});
