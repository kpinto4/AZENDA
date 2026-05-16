import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sqlDbService: SqlDbService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.sqlDbService.findUserByEmailNormalized(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const valid = await this.passwordService.verify(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    let authUser = user;
    if (!this.passwordService.isBcryptHash(user.password)) {
      const hash = await this.passwordService.hash(dto.password);
      const updated = await this.sqlDbService.updateUser(user.id, { password: hash });
      if (updated) {
        authUser = updated;
      }
    }

    if (authUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario no activo');
    }

    const payload = {
      sub: authUser.id,
      email: authUser.email,
      role: authUser.role,
      tenantId: authUser.tenantId,
      systems: authUser.systems,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      user: this.toSafeUser(authUser),
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
