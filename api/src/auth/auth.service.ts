import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser, AppSystem, UserRole } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly users: AuthUser[] = [
    {
      id: 'usr_super_1',
      email: 'super@azenda.dev',
      password: 'azenda123',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      systems: [
        AppSystem.SUPER_ADMIN,
        AppSystem.TENANT,
        AppSystem.PUBLIC_BOOKING,
      ],
      status: 'ACTIVE',
    },
    {
      id: 'usr_admin_spa',
      email: 'admin-spa@azenda.dev',
      password: 'azenda123',
      role: UserRole.ADMIN,
      tenantId: 'tenant_spa',
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    },
    {
      id: 'usr_admin_clinica',
      email: 'admin-clinica@azenda.dev',
      password: 'azenda123',
      role: UserRole.ADMIN,
      tenantId: 'tenant_clinica',
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'PAUSED',
    },
    {
      id: 'usr_employee_1',
      email: 'empleado@azenda.dev',
      password: 'azenda123',
      role: UserRole.EMPLEADO,
      tenantId: 'tenant_barberia',
      systems: [AppSystem.TENANT],
      status: 'ACTIVE',
    },
  ];

  constructor(private readonly jwtService: JwtService) {}

  login(dto: LoginDto) {
    const user = this.users.find(
      (candidate) =>
        candidate.email === dto.email && candidate.password === dto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario no activo');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      systems: user.systems,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      user: this.toSafeUser(user),
    };
  }

  me(userId: string) {
    const user = this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.toSafeUser(user);
  }

  findById(userId: string) {
    return this.users.find((user) => user.id === userId);
  }

  private toSafeUser(user: AuthUser) {
    const safeUser = { ...user };
    delete safeUser.password;
    return safeUser;
  }
}
