import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sqlDbService: SqlDbService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.sqlDbService.findUserByCredentials(dto.email, dto.password);

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

  async me(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.toSafeUser(user);
  }

  async findById(userId: string) {
    return this.sqlDbService.findUserById(userId);
  }

  private toSafeUser(user: AuthUser) {
    const safeUser = { ...user };
    delete safeUser.password;
    return safeUser;
  }
}
