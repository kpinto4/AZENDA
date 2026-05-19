import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppSystem, AuthUser, UserRole } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sqlDbService: SqlDbService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.sqlDbService.findUserByEmailNormalized(email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    const business = dto.business.trim();
    const tenantId = `tenant_${Date.now()}`;
    const slug = await this.uniqueTenantSlug(business, tenantId);

    await this.sqlDbService.createTenant({
      id: tenantId,
      name: business,
      slug,
      status: 'ACTIVE',
      plan: 'Trial',
      storefrontEnabled: false,
      modules: { citas: true, ventas: true, inventario: true },
    });

    const userId = `usr_${Date.now()}`;
    await this.sqlDbService.createUser({
      id: userId,
      email,
      password: dto.password,
      role: UserRole.ADMIN,
      tenantId,
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    });

    return this.login({ email, password: dto.password });
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.sqlDbService.findUserByEmailNormalized(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const valid = await this.passwordService.verify(
      dto.password,
      user.password,
    );
    if (!valid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    let authUser = user;
    if (!this.passwordService.isBcryptHash(user.password)) {
      const hash = await this.passwordService.hash(dto.password);
      const updated = await this.sqlDbService.updateUser(user.id, {
        password: hash,
      });
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

  private slugifyName(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36);
    return base.length ? base : 'negocio';
  }

  private async uniqueTenantSlug(
    businessName: string,
    tenantId: string,
  ): Promise<string> {
    const suffix = tenantId.replace(/^tenant_/, '') || tenantId;
    let candidate = `${this.slugifyName(businessName)}-${suffix}`;
    let attempt = 0;
    while (await this.sqlDbService.findTenantBySlug(candidate)) {
      attempt += 1;
      candidate = `${this.slugifyName(businessName)}-${suffix}-${attempt}`;
    }
    return candidate;
  }
}
