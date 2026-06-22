import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppSystem, AuthUser, UserRole } from './auth.types';
import { AuthService } from './auth.service';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { PasswordService } from './password.service';

describe('AuthService', () => {
  const activeUser: AuthUser = {
    id: 'usr_1',
    email: 'admin@azenda.dev',
    password: 'secret',
    role: UserRole.ADMIN,
    tenantId: 'tenant_1',
    systems: [AppSystem.TENANT],
    status: 'ACTIVE',
  };

  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let passwordService: {
    verify: jest.Mock;
    isBcryptHash: jest.Mock;
    hash: jest.Mock;
  };
  let sqlDbService: {
    findUserByEmailNormalized: jest.Mock<
      Promise<AuthUser | undefined>,
      [string]
    >;
    findUserById: jest.Mock<Promise<AuthUser | undefined>, [string]>;
    updateUser: jest.Mock;
    createTenant: jest.Mock;
    createUser: jest.Mock;
    findTenantBySlug: jest.Mock;
    isDemoTenant: jest.Mock;
  };

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn(() => 'signed-token'),
    };
    passwordService = {
      verify: jest.fn(),
      isBcryptHash: jest.fn(() => true),
      hash: jest.fn(async () => '$2b$10$abcdefghijklmnopqrstuv'),
    };
    sqlDbService = {
      findUserByEmailNormalized: jest.fn(),
      findUserById: jest.fn(),
      updateUser: jest.fn(),
      createTenant: jest.fn(),
      createUser: jest.fn(),
      findTenantBySlug: jest.fn().mockResolvedValue(undefined),
      isDemoTenant: jest.fn().mockResolvedValue(false),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: SqlDbService, useValue: sqlDbService },
        { provide: PasswordService, useValue: passwordService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('registra tenant pausado con plan elegido y pago pendiente', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue(undefined);
    sqlDbService.createTenant.mockResolvedValue(undefined);
    sqlDbService.createUser.mockResolvedValue(undefined);
    sqlDbService.findUserByEmailNormalized.mockResolvedValueOnce(undefined).mockResolvedValueOnce(activeUser);
    passwordService.verify.mockResolvedValue(true);

    await service.register({
      business: 'Mi Peluquería',
      email: 'nuevo@azenda.dev',
      password: 'secret',
      selectedPlan: 'Pro',
      billingCycle: 'MONTHLY',
    });

    expect(sqlDbService.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'Pro',
        status: 'PAUSED',
        subscriptionStatus: 'pending_payment',
        billingCycle: 'MONTHLY',
        modules: { citas: true, ventas: true, inventario: true },
      }),
    );
  });

  it('hace login y devuelve usuario sin password', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);

    const res = await service.login({
      email: activeUser.email,
      password: 'secret',
    });

    expect(sqlDbService.findUserByEmailNormalized).toHaveBeenCalledWith(
      activeUser.email.trim().toLowerCase(),
    );
    expect(passwordService.verify).toHaveBeenCalledWith(
      'secret',
      activeUser.password,
    );
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      tenantId: activeUser.tenantId,
      systems: activeUser.systems,
    });
    expect(res.accessToken).toBe('signed-token');
    expect(res.user).toEqual({
      id: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      tenantId: activeUser.tenantId,
      systems: activeUser.systems,
      status: activeUser.status,
    });
    expect((res.user as Partial<AuthUser>).password).toBeUndefined();
  });

  it('rechaza credenciales invalidas', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue(undefined);

    await expect(
      service.login({ email: 'missing@azenda.dev', password: 'bad' }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales invalidas'));
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rechaza contrasena incorrecta', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: activeUser.email, password: 'wrong' }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales invalidas'));
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rechaza usuarios no activos', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue({
      ...activeUser,
      status: 'PAUSED',
    });
    passwordService.verify.mockResolvedValue(true);

    await expect(
      service.login({ email: activeUser.email, password: 'secret' }),
    ).rejects.toThrow(new UnauthorizedException('Usuario no activo'));
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('devuelve perfil en me sin password', async () => {
    sqlDbService.findUserById.mockResolvedValue(activeUser);

    const me = await service.me(activeUser.id);

    expect(sqlDbService.findUserById).toHaveBeenCalledWith(activeUser.id);
    expect(me).toEqual({
      id: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      tenantId: activeUser.tenantId,
      systems: activeUser.systems,
      status: activeUser.status,
    });
    expect((me as Partial<AuthUser>).password).toBeUndefined();
  });

  it('falla en me cuando no existe el usuario', async () => {
    sqlDbService.findUserById.mockResolvedValue(undefined);

    await expect(service.me('missing-user')).rejects.toThrow(
      new UnauthorizedException('Usuario no encontrado'),
    );
  });

  it('inicia sesion demo showcase como admin', async () => {
    const demoUser: AuthUser = {
      ...activeUser,
      id: 'usr_demo_admin',
      email: 'demo-admin@azenda.dev',
      tenantId: 'tenant_azenda_demo',
    };
    sqlDbService.findUserByEmailNormalized.mockResolvedValue(demoUser);
    sqlDbService.isDemoTenant.mockResolvedValue(true);

    const res = await service.startDemoSession({ role: 'admin' });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: demoUser.id,
        isDemoShowcase: true,
        tenantId: 'tenant_azenda_demo',
      }),
    );
    expect(res.isDemoShowcase).toBe(true);
  });

  it('rechaza demo si el tenant no es showroom', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue({
      ...activeUser,
      tenantId: 'tenant_azenda_demo',
    });
    sqlDbService.isDemoTenant.mockResolvedValue(false);

    await expect(service.startDemoSession()).rejects.toThrow(
      new UnauthorizedException('Demo no disponible'),
    );
  });
});
