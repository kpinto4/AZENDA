import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppSystem, AuthUser, UserRole } from './auth.types';
import { AuthService } from './auth.service';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';

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
  let sqlDbService: {
    findUserByCredentials: jest.Mock<AuthUser | undefined, [string, string]>;
    findUserById: jest.Mock<AuthUser | undefined, [string]>;
  };

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn(() => 'signed-token'),
    };
    sqlDbService = {
      findUserByCredentials: jest.fn(),
      findUserById: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: SqlDbService, useValue: sqlDbService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('hace login y devuelve usuario sin password', () => {
    sqlDbService.findUserByCredentials.mockReturnValue(activeUser);

    const res = service.login({ email: activeUser.email, password: 'secret' });

    expect(sqlDbService.findUserByCredentials).toHaveBeenCalledWith(
      activeUser.email,
      'secret',
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

  it('rechaza credenciales invalidas', () => {
    sqlDbService.findUserByCredentials.mockReturnValue(undefined);

    expect(() =>
      service.login({ email: 'missing@azenda.dev', password: 'bad' }),
    ).toThrow(new UnauthorizedException('Credenciales invalidas'));
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rechaza usuarios no activos', () => {
    sqlDbService.findUserByCredentials.mockReturnValue({
      ...activeUser,
      status: 'PAUSED',
    });

    expect(() =>
      service.login({ email: activeUser.email, password: 'secret' }),
    ).toThrow(new UnauthorizedException('Usuario no activo'));
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('devuelve perfil en me sin password', () => {
    sqlDbService.findUserById.mockReturnValue(activeUser);

    const me = service.me(activeUser.id);

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

  it('falla en me cuando no existe el usuario', () => {
    sqlDbService.findUserById.mockReturnValue(undefined);

    expect(() => service.me('missing-user')).toThrow(
      new UnauthorizedException('Usuario no encontrado'),
    );
  });
});
