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
    findUserByEmailNormalized: jest.Mock<Promise<AuthUser | undefined>, [string]>;
    findUserById: jest.Mock<Promise<AuthUser | undefined>, [string]>;
    updateUser: jest.Mock;
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

  it('hace login y devuelve usuario sin password', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);

    const res = await service.login({ email: activeUser.email, password: 'secret' });

    expect(sqlDbService.findUserByEmailNormalized).toHaveBeenCalledWith(activeUser.email.trim().toLowerCase());
    expect(passwordService.verify).toHaveBeenCalledWith('secret', activeUser.password);
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

    await expect(service.login({ email: activeUser.email, password: 'wrong' })).rejects.toThrow(
      new UnauthorizedException('Credenciales invalidas'),
    );
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rechaza usuarios no activos', async () => {
    sqlDbService.findUserByEmailNormalized.mockResolvedValue({
      ...activeUser,
      status: 'PAUSED',
    });
    passwordService.verify.mockResolvedValue(true);

    await expect(service.login({ email: activeUser.email, password: 'secret' })).rejects.toThrow(
      new UnauthorizedException('Usuario no activo'),
    );
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
});
