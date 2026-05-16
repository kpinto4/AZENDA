import { Injectable, Logger } from '@nestjs/common';
import { AppSystem, UserRole } from '../../../auth/auth.types';
import { PasswordService } from '../../../auth/password.service';
import { PgClientService } from '../pg-client.service';
import { UserEntity } from '../sql-db.types';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    private readonly pg: PgClientService,
    private readonly passwordService: PasswordService,
  ) {}

  private mapUserRow(row: Record<string, unknown>): UserEntity {
    return {
      id: String(row.id),
      email: String(row.email),
      password: String(row.password),
      role: row.role as UserRole,
      tenantId: row.tenant_id ? String(row.tenant_id) : null,
      systems: JSON.parse(String(row.systems)) as AppSystem[],
      status: row.status as UserEntity['status'],
    };
  }

  async findByEmailNormalized(normalizedEmail: string): Promise<UserEntity | undefined> {
    const row = await this.pg.queryOne(
      `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE LOWER(TRIM(email)) = ?
      `,
      [normalizedEmail.trim().toLowerCase()],
    );
    return row ? this.mapUserRow(row) : undefined;
  }

  async findById(userId: string): Promise<UserEntity | undefined> {
    const row = await this.pg.queryOne(
      `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE id = ?
      `,
      [userId],
    );
    return row ? this.mapUserRow(row) : undefined;
  }

  async listAll(): Promise<UserEntity[]> {
    const rows = await this.pg.queryRows(
      `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        ORDER BY email ASC
      `,
    );
    return rows.map((row) => this.mapUserRow(row as Record<string, unknown>));
  }

  async listByTenantId(tenantId: string): Promise<UserEntity[]> {
    const rows = await this.pg.queryRows(
      `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE tenant_id = ?
        ORDER BY email ASC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapUserRow(row as Record<string, unknown>));
  }

  async create(data: UserEntity): Promise<UserEntity> {
    const passwordStored = this.passwordService.isBcryptHash(data.password)
      ? data.password
      : await this.passwordService.hash(data.password);
    const row: UserEntity = { ...data, password: passwordStored };
    await this.pg.exec(
      `
        INSERT INTO users (id, email, password, role, tenant_id, systems, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.email,
        row.password,
        row.role,
        row.tenantId,
        JSON.stringify(row.systems),
        row.status,
      ],
    );
    return row;
  }

  async update(userId: string, patch: Partial<Omit<UserEntity, 'id'>>): Promise<UserEntity | undefined> {
    const current = await this.findById(userId);
    if (!current) {
      return undefined;
    }

    let nextPassword = current.password;
    if (patch.password !== undefined && String(patch.password).trim().length > 0) {
      const p = String(patch.password);
      nextPassword = this.passwordService.isBcryptHash(p) ? p : await this.passwordService.hash(p);
    }

    const next: UserEntity = {
      id: current.id,
      email: patch.email !== undefined ? patch.email : current.email,
      password: nextPassword,
      role: patch.role !== undefined ? patch.role : current.role,
      tenantId: patch.tenantId !== undefined ? patch.tenantId : current.tenantId,
      systems: patch.systems !== undefined ? patch.systems : current.systems,
      status: patch.status !== undefined ? patch.status : current.status,
    };

    await this.pg.exec(
      `
        UPDATE users
        SET email = ?, password = ?, role = ?, tenant_id = ?, systems = ?, status = ?
        WHERE id = ?
      `,
      [
        next.email,
        next.password,
        next.role,
        next.tenantId,
        JSON.stringify(next.systems),
        next.status,
        userId,
      ],
    );

    return next;
  }

  async delete(userId: string): Promise<boolean> {
    const existing = await this.findById(userId);
    if (!existing) {
      return false;
    }
    await this.pg.exec(`DELETE FROM users WHERE id = ?`, [userId]);
    return true;
  }

  async deleteByTenant(userId: string, tenantId: string): Promise<boolean> {
    const existing = await this.findById(userId);
    if (!existing || existing.tenantId !== tenantId) {
      return false;
    }
    await this.pg.exec(`DELETE FROM users WHERE id = ? AND tenant_id = ?`, [userId, tenantId]);
    return true;
  }

  async migrateLegacyPlaintextPasswords(): Promise<void> {
    const rows = await this.pg.queryRows(
      `SELECT id, password FROM users WHERE password IS NOT NULL AND password NOT LIKE '$2%'`,
    );
    for (const r of rows) {
      const id = String(r.id);
      const plain = String(r.password);
      const hash = await this.passwordService.hash(plain);
      await this.pg.exec(`UPDATE users SET password = ? WHERE id = ?`, [hash, id]);
      this.logger.log(`Clave de usuario ${id} migrada a hash (login compatible).`);
    }
  }
}
