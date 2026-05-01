import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Pool } from 'pg';
import { AppSystem, UserRole } from '../../auth/auth.types';
import { SQLITE_INITIAL_SCHEMA } from './sqlite-schema';
import {
  AppointmentAttendance,
  AppointmentEntity,
  AppointmentStatus,
  StoreVisitLogEntity,
  TenantBrandingEntity,
  TenantEntity,
  TenantProductEntity,
  TenantServiceEntity,
  UserEntity,
} from './sql-db.types';

function envIsTruthy(v: string | undefined): boolean {
  if (v == null || !String(v).trim()) {
    return false;
  }
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

type SqliteDatabaseSync = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => void;
    get: (...params: unknown[]) => Record<string, unknown> | undefined;
    all: (...params: unknown[]) => Record<string, unknown>[];
  };
  close: () => void;
};

type SqliteModule = {
  DatabaseSync: new (path: string) => SqliteDatabaseSync;
};

@Injectable()
export class SqlDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqlDbService.name);
  private readonly dialect: 'postgres' | 'sqlite';
  private readonly pool: Pool | null;
  private readonly sqliteDb: SqliteDatabaseSync | null;

  constructor() {
    if (envIsTruthy(process.env.USE_SQLITE)) {
      this.dialect = 'sqlite';
      this.pool = null;
      const dbPath = resolve(process.cwd(), 'data', 'azenda.db');
      mkdirSync(dirname(dbPath), { recursive: true });
      const sqlite = require('node:sqlite') as SqliteModule;
      this.sqliteDb = new sqlite.DatabaseSync(dbPath);
      this.logger.log(`SQLite local: ${dbPath} (USE_SQLITE=1)`);
      return;
    }
    this.dialect = 'postgres';
    this.sqliteDb = null;
    const database = (process.env.PGDATABASE ?? 'azenda').trim();
    const connectionString = process.env.DATABASE_URL?.trim();
    const sslMode = (process.env.PGSSLMODE ?? '').trim().toLowerCase();
    const requireSsl =
      sslMode === 'require' ||
      envIsTruthy(process.env.PGSSL) ||
      (connectionString?.toLowerCase().includes('sslmode=require') ?? false);
    const ssl = requireSsl ? { rejectUnauthorized: false } : undefined;
    this.pool = connectionString
      ? new Pool({
          connectionString,
          ssl,
          max: 10,
        })
      : new Pool({
          host: process.env.PGHOST ?? '127.0.0.1',
          port: Number(process.env.PGPORT ?? 5432),
          user: process.env.PGUSER ?? 'postgres',
          password: process.env.PGPASSWORD ?? 'postgres',
          database,
          ssl,
          max: 10,
        });
  }

  async onModuleInit(): Promise<void> {
    const runOnStart = envIsTruthy(process.env.DB_BOOTSTRAP_ON_START);
    if (runOnStart) {
      await this.runBootstrapInternal('arranque (DB_BOOTSTRAP_ON_START)');
      return;
    }
    await this.pingOrThrow();
    if (this.dialect === 'sqlite') {
      this.logger.log(
        'SQLite: esquema/semilla no se ejecutan en cada arranque. Primera vez: npm run db:bootstrap (tambien aplica en SQLite).',
      );
      return;
    }
    this.logger.log(
      'PostgreSQL conectado; esquema/semilla NO se ejecutan en cada arranque. ' +
        'Primera vez o tras cambios: `npm run db:bootstrap` (raiz del repo). ' +
        'Opcional: DB_BOOTSTRAP_ON_START=1 para hacerlo siempre al iniciar. ' +
        'Sin PostgreSQL/Docker: USE_SQLITE=1 y archivo api/data/azenda.db.',
    );
  }

  /**
   * Crea tablas (IF NOT EXISTS), migraciones ligeras y semilla si no hay usuarios.
   * Llamar desde `npm run db:bootstrap` o con DB_BOOTSTRAP_ON_START=1 en arranque.
   */
  async runBootstrap(): Promise<void> {
    await this.runBootstrapInternal('db:bootstrap / runBootstrap()');
  }

  private async pingOrThrow(): Promise<void> {
    if (this.dialect === 'sqlite') {
      try {
        this.sqliteDb!.prepare('SELECT 1').get();
      } catch (err: unknown) {
        this.logger.error('SQLite: no se pudo leer api/data/azenda.db');
        throw err;
      }
      return;
    }
    const dbName = (process.env.PGDATABASE ?? 'azenda').trim();
    const host = process.env.PGHOST ?? '127.0.0.1';
    const port = Number(process.env.PGPORT ?? 5432);
    try {
      await this.queryRows('SELECT 1');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isConn =
        code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN';
      if (isConn) {
        this.logger.error(
          `No hay conexion a PostgreSQL en ${host}:${port} (base "${dbName}"). ` +
            `Arranca PostgreSQL, crea la base (npm run db:create-db), credenciales PG*. ` +
            `Sin PostgreSQL: desarrollo local con USE_SQLITE=1 (api/data/azenda.db).`,
        );
      }
      throw err;
    }
  }

  private async runBootstrapInternal(context: string): Promise<void> {
    const dbName = (process.env.PGDATABASE ?? 'azenda').trim();
    const host = process.env.PGHOST ?? '127.0.0.1';
    const port = Number(process.env.PGPORT ?? 5432);
    try {
      await this.createSchema();
      await this.ensureSchemaMigrations();
      await this.seedIfEmpty();
      this.logger.log(
        `${this.dialect === 'sqlite' ? 'SQLite' : 'PostgreSQL'} listo (${context}): esquema y semilla verificados`,
      );
    } catch (err: unknown) {
      if (this.dialect === 'postgres') {
        const code = (err as { code?: string }).code;
        const isConn =
          code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN';
        if (isConn) {
          this.logger.error(
            `No hay conexion a PostgreSQL en ${host}:${port} (base "${dbName}"). ` +
              `Arranca PostgreSQL, ejecuta CREATE DATABASE ${dbName}, ` +
              `ajusta PGUSER/PGPASSWORD si hace falta. ` +
              `Si la base existe pero faltan tablas: npm run db:bootstrap. ` +
              `Sin PostgreSQL: USE_SQLITE=1.`,
          );
        }
      }
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.dialect === 'sqlite') {
      this.sqliteDb!.close();
      return;
    }
    await this.pool!.end();
  }

  private toPgSql(sql: string): string {
    let n = 0;
    return sql.replace(/\?/g, () => `$${++n}`);
  }

  private async queryRows(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    if (this.dialect === 'sqlite') {
      return this.sqliteDb!.prepare(sql).all(...params) as Record<string, unknown>[];
    }
    const res = await this.pool!.query(this.toPgSql(sql), params);
    return res.rows as Record<string, unknown>[];
  }

  private async queryOne(sql: string, params: unknown[] = []): Promise<Record<string, unknown> | undefined> {
    if (this.dialect === 'sqlite') {
      return this.sqliteDb!.prepare(sql).get(...params) as Record<string, unknown> | undefined;
    }
    const rows = await this.queryRows(sql, params);
    return rows[0] as Record<string, unknown> | undefined;
  }

  private async exec(sql: string, params: unknown[] = []): Promise<void> {
    if (this.dialect === 'sqlite') {
      this.sqliteDb!.prepare(sql).run(...params);
      return;
    }
    await this.pool!.query(this.toPgSql(sql), params);
  }

  private async execScript(sql: string): Promise<void> {
    if (this.dialect === 'sqlite') {
      this.sqliteDb!.exec(sql);
      return;
    }
    await this.pool!.query(sql);
  }

  private async ensureIndex(createSql: string): Promise<void> {
    if (this.dialect === 'sqlite') {
      try {
        this.sqliteDb!.exec(createSql.replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS '));
      } catch {
        /* indice ya existe u otro error benigno en dev */
      }
      return;
    }
    try {
      await this.pool!.query(createSql);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === '42P07') {
        return;
      }
      throw e;
    }
  }

  async findUserByCredentials(email: string, password: string): Promise<UserEntity | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const row = await this.queryOne(
      `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE LOWER(TRIM(email)) = ? AND password = ?
      `,
      [normalizedEmail, password],
    );
    return row ? this.mapUserRow(row) : undefined;
  }

  async findUserById(userId: string): Promise<UserEntity | undefined> {
    const row = await this.queryOne(
      `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE id = ?
      `,
      [userId],
    );
    return row ? this.mapUserRow(row) : undefined;
  }

  async listUsers(): Promise<UserEntity[]> {
    const rows = await this.queryRows(
      `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        ORDER BY email ASC
      `,
    );
    return rows.map((row) => this.mapUserRow(row as Record<string, unknown>));
  }

  async listUsersByTenantId(tenantId: string): Promise<UserEntity[]> {
    const rows = await this.queryRows(
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

  async createUser(data: UserEntity): Promise<UserEntity> {
    await this.exec(
      `
        INSERT INTO users (id, email, password, role, tenant_id, systems, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.id,
        data.email,
        data.password,
        data.role,
        data.tenantId,
        JSON.stringify(data.systems),
        data.status,
      ],
    );
    return data;
  }

  async updateUser(
    userId: string,
    patch: Partial<Omit<UserEntity, 'id'>>,
  ): Promise<UserEntity | undefined> {
    const current = await this.findUserById(userId);
    if (!current) {
      return undefined;
    }

    const next: UserEntity = {
      ...current,
      ...patch,
      systems: patch.systems ?? current.systems,
    };

    await this.exec(
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

  async deleteUser(userId: string): Promise<boolean> {
    const existing = await this.findUserById(userId);
    if (!existing) {
      return false;
    }
    await this.exec(`DELETE FROM users WHERE id = ?`, [userId]);
    return true;
  }

  async deleteUserByTenant(userId: string, tenantId: string): Promise<boolean> {
    const existing = await this.findUserById(userId);
    if (!existing || existing.tenantId !== tenantId) {
      return false;
    }
    await this.exec(`DELETE FROM users WHERE id = ? AND tenant_id = ?`, [userId, tenantId]);
    return true;
  }

  async listTenants(): Promise<TenantEntity[]> {
    const rows = await this.queryRows(
      `
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        ORDER BY name ASC
      `,
    );
    return rows.map((row) => this.mapTenantRow(row as Record<string, unknown>));
  }

  async findTenantBySlug(slug: string): Promise<TenantEntity | undefined> {
    const row = await this.queryOne(
      `
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        WHERE slug = ?
      `,
      [slug],
    );
    return row ? this.mapTenantRow(row) : undefined;
  }

  async findTenantById(tenantId: string): Promise<TenantEntity | undefined> {
    const row = await this.queryOne(
      `
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        WHERE id = ?
      `,
      [tenantId],
    );
    return row ? this.mapTenantRow(row) : undefined;
  }

  async createTenant(
    data: Omit<TenantEntity, 'manualBookingEnabled'> & {
      manualBookingEnabled?: boolean;
    },
  ): Promise<TenantEntity> {
    const row: TenantEntity = {
      ...data,
      plan: data.plan ?? 'Trial',
      storefrontEnabled: data.storefrontEnabled ?? false,
      manualBookingEnabled: data.manualBookingEnabled ?? true,
    };
    await this.exec(
      `
        INSERT INTO tenants (
          id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        row.name,
        row.slug,
        row.status,
        row.plan,
        row.storefrontEnabled ? true : false,
        row.manualBookingEnabled ? true : false,
        row.modules.citas ? true : false,
        row.modules.ventas ? true : false,
        row.modules.inventario ? true : false,
      ],
    );

    await this.ensureTenantBranding(row.id, row.name);
    return row;
  }

  async updateTenant(
    tenantId: string,
    patch: Omit<Partial<TenantEntity>, 'modules'> & {
      modules?: Partial<TenantEntity['modules']>;
    },
  ): Promise<TenantEntity | undefined> {
    const current = await this.findTenantById(tenantId);
    if (!current) {
      return undefined;
    }

    const next: TenantEntity = {
      ...current,
      name: patch.name ?? current.name,
      slug: patch.slug ?? current.slug,
      status: patch.status ?? current.status,
      plan: patch.plan ?? current.plan,
      storefrontEnabled:
        patch.storefrontEnabled !== undefined ? patch.storefrontEnabled : current.storefrontEnabled,
      manualBookingEnabled:
        patch.manualBookingEnabled !== undefined
          ? patch.manualBookingEnabled
          : current.manualBookingEnabled,
      modules: {
        ...current.modules,
        ...(patch.modules ?? {}),
      },
    };

    await this.exec(
      `
        UPDATE tenants
        SET name = ?, slug = ?, status = ?, plan = ?, storefront_enabled = ?, manual_booking_enabled = ?,
            citas_enabled = ?, ventas_enabled = ?, inventario_enabled = ?
        WHERE id = ?
      `,
      [
        next.name,
        next.slug,
        next.status,
        next.plan,
        next.storefrontEnabled ? true : false,
        next.manualBookingEnabled ? true : false,
        next.modules.citas ? true : false,
        next.modules.ventas ? true : false,
        next.modules.inventario ? true : false,
        tenantId,
      ],
    );

    return next;
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    const existing = await this.findTenantById(tenantId);
    if (!existing) {
      return false;
    }
    await this.exec(`DELETE FROM tenants WHERE id = ?`, [tenantId]);
    return true;
  }

  async listAppointmentsByTenantId(tenantId: string): Promise<AppointmentEntity[]> {
    const rows = await this.queryRows(
      `
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE tenant_id = ?
        ORDER BY when_at ASC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapAppointmentRow(row as Record<string, unknown>));
  }

  async createAppointment(data: {
    tenantId: string;
    customer: string;
    service: string;
    when: string;
    status?: AppointmentStatus;
    attendance?: AppointmentAttendance;
  }): Promise<AppointmentEntity> {
    const id = `appt_${Date.now()}`;
    const status = data.status ?? 'pendiente';
    const attendance = data.attendance ?? 'PENDIENTE';
    await this.exec(
      `
        INSERT INTO appointments (id, tenant_id, customer, service, when_at, status, attendance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [id, data.tenantId, data.customer, data.service, data.when, status, attendance],
    );

    return {
      id,
      tenantId: data.tenantId,
      customer: data.customer,
      service: data.service,
      when: data.when,
      status,
      attendance,
    };
  }

  async findAppointmentByTenantAndWhen(
    tenantId: string,
    when: string,
  ): Promise<AppointmentEntity | undefined> {
    const row = await this.queryOne(
      `
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE tenant_id = ? AND when_at = ?
        LIMIT 1
      `,
      [tenantId, when],
    );
    return row ? this.mapAppointmentRow(row) : undefined;
  }

  async findAppointmentById(appointmentId: string): Promise<AppointmentEntity | undefined> {
    const row = await this.queryOne(
      `
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE id = ?
      `,
      [appointmentId],
    );
    return row ? this.mapAppointmentRow(row) : undefined;
  }

  async updateAppointmentStatus(
    appointmentId: string,
    tenantId: string,
    status: AppointmentStatus,
  ): Promise<AppointmentEntity | undefined> {
    const current = await this.findAppointmentById(appointmentId);
    if (!current || current.tenantId !== tenantId) {
      return undefined;
    }
    await this.exec(`UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?`, [
      status,
      appointmentId,
      tenantId,
    ]);
    return { ...current, status };
  }

  async updateAppointmentAttendance(
    appointmentId: string,
    tenantId: string,
    attendance: AppointmentAttendance,
  ): Promise<AppointmentEntity | undefined> {
    const current = await this.findAppointmentById(appointmentId);
    if (!current || current.tenantId !== tenantId) {
      return undefined;
    }
    const status: AppointmentStatus =
      attendance === 'ASISTIO'
        ? 'confirmada'
        : attendance === 'NO_ASISTIO'
          ? 'cancelada'
          : 'pendiente';
    await this.exec(
      `UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`,
      [attendance, status, appointmentId, tenantId],
    );
    return { ...current, attendance, status };
  }

  /**
   * Cliente confirma que acudió a la cita (nombre debe coincidir con la reserva).
   */
  async confirmPublicAppointmentAttendance(
    slug: string,
    appointmentId: string,
    customerName: string,
  ): Promise<AppointmentEntity | undefined> {
    const tenant = await this.findTenantBySlug(slug);
    if (!tenant || tenant.status !== 'ACTIVE' || !tenant.modules.citas) {
      return undefined;
    }
    const appt = await this.findAppointmentById(appointmentId);
    if (!appt || appt.tenantId !== tenant.id) {
      return undefined;
    }
    if (appt.status === 'cancelada') {
      return undefined;
    }
    const norm = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    if (norm(appt.customer) !== norm(customerName)) {
      return undefined;
    }
    await this.exec(
      `UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`,
      ['ASISTIO', 'confirmada', appointmentId, tenant.id],
    );
    return { ...appt, attendance: 'ASISTIO', status: 'confirmada' };
  }

  async listStoreVisitsByTenantId(tenantId: string): Promise<StoreVisitLogEntity[]> {
    const rows = await this.queryRows(
      `
        SELECT id, tenant_id, customer, detail, created_at
        FROM store_visit_logs
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapStoreVisitRow(row as Record<string, unknown>));
  }

  async createStoreVisitLog(data: {
    tenantId: string;
    customer: string;
    detail: string;
  }): Promise<StoreVisitLogEntity> {
    const id = `visit_${Date.now()}`;
    const createdAt = new Date().toISOString();
    await this.exec(
      `
        INSERT INTO store_visit_logs (id, tenant_id, customer, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, data.tenantId, data.customer, data.detail, createdAt],
    );

    return {
      id,
      tenantId: data.tenantId,
      customer: data.customer,
      detail: data.detail,
      createdAt,
    };
  }

  async getTenantBranding(tenantId: string): Promise<TenantBrandingEntity> {
    const row = await this.queryOne(
      `
        SELECT tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `,
      [tenantId],
    );
    if (row) {
      return this.mapTenantBrandingRow(row);
    }
    const tenant = await this.findTenantById(tenantId);
    return await this.ensureTenantBranding(tenantId, tenant?.name ?? 'Tu negocio');
  }

  async updateTenantBranding(
    tenantId: string,
    patch: Partial<Omit<TenantBrandingEntity, 'tenantId'>>,
  ): Promise<TenantBrandingEntity> {
    const current = await this.getTenantBranding(tenantId);
    const next: TenantBrandingEntity = {
      ...current,
      ...patch,
      tenantId,
      logoUrl:
        patch.logoUrl === undefined
          ? current.logoUrl
          : patch.logoUrl === ''
            ? null
            : patch.logoUrl,
      catalogLayout:
        patch.catalogLayout === 'grid' || patch.catalogLayout === 'horizontal'
          ? patch.catalogLayout
          : current.catalogLayout,
    };
    await this.exec(
      `
        UPDATE tenant_branding
        SET display_name = ?, logo_url = ?, catalog_layout = ?, primary_color = ?, accent_color = ?, bg_color = ?, surface_color = ?, text_color = ?,
            border_radius_px = ?, use_gradient = ?, gradient_from = ?, gradient_to = ?, gradient_angle_deg = ?
        WHERE tenant_id = ?
      `,
      [
        next.displayName,
        next.logoUrl,
        next.catalogLayout,
        next.primaryColor,
        next.accentColor,
        next.bgColor,
        next.surfaceColor,
        next.textColor,
        Math.round(next.borderRadiusPx),
        next.useGradient ? true : false,
        next.gradientFrom,
        next.gradientTo,
        Math.round(next.gradientAngleDeg),
        tenantId,
      ],
    );
    return next;
  }

  async listProductsByTenantId(tenantId: string): Promise<TenantProductEntity[]> {
    const rows = await this.queryRows(
      `
        SELECT id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url
        FROM tenant_products
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapTenantProductRow(row as Record<string, unknown>));
  }

  async createTenantProduct(
    tenantId: string,
    data: Omit<TenantProductEntity, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantProductEntity> {
    const id = `prd_${Date.now()}`;
    const rowOrder = await this.queryOne(
      `SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_products WHERE tenant_id = ?`,
      [tenantId],
    );
    const catalogOrder = Number(rowOrder?.next_order ?? 0);
    await this.exec(
      `
        INSERT INTO tenant_products (id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        tenantId,
        data.name.trim(),
        data.description?.trim() || null,
        Math.max(0, Number(data.price) || 0),
        data.promoPrice == null ? null : Math.max(0, Number(data.promoPrice) || 0),
        data.sku.trim(),
        Math.max(0, Math.floor(Number(data.stock) || 0)),
        catalogOrder,
        data.imageUrl ?? null,
      ],
    );
    const list = await this.listProductsByTenantId(tenantId);
    return list.find((p) => p.id === id)!;
  }

  async updateTenantProduct(
    tenantId: string,
    productId: string,
    patch: Omit<Partial<TenantProductEntity>, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantProductEntity | undefined> {
    const list = await this.listProductsByTenantId(tenantId);
    const current = list.find((p) => p.id === productId);
    if (!current) {
      return undefined;
    }
    const next = {
      ...current,
      ...patch,
      name: patch.name?.trim() ?? current.name,
      description:
        patch.description === undefined ? current.description : patch.description?.trim() || null,
      sku: patch.sku?.trim() ?? current.sku,
      price: patch.price === undefined ? current.price : Math.max(0, Number(patch.price) || 0),
      promoPrice:
        patch.promoPrice === undefined
          ? current.promoPrice
          : patch.promoPrice == null
            ? null
            : Math.max(0, Number(patch.promoPrice) || 0),
      stock:
        patch.stock === undefined
          ? current.stock
          : Math.max(0, Math.floor(Number(patch.stock) || 0)),
      imageUrl:
        patch.imageUrl === undefined
          ? current.imageUrl
          : patch.imageUrl === ''
            ? null
            : patch.imageUrl,
    };
    await this.exec(
      `
        UPDATE tenant_products
        SET name = ?, description = ?, price = ?, promo_price = ?, sku = ?, stock = ?, image_url = ?
        WHERE id = ? AND tenant_id = ?
      `,
      [
        next.name,
        next.description,
        next.price,
        next.promoPrice,
        next.sku,
        next.stock,
        next.imageUrl,
        productId,
        tenantId,
      ],
    );
    const after = await this.listProductsByTenantId(tenantId);
    return after.find((p) => p.id === productId);
  }

  async deleteTenantProduct(tenantId: string, productId: string): Promise<boolean> {
    const list = await this.listProductsByTenantId(tenantId);
    const exists = list.some((p) => p.id === productId);
    if (!exists) {
      return false;
    }
    await this.exec(`DELETE FROM tenant_products WHERE id = ? AND tenant_id = ?`, [
      productId,
      tenantId,
    ]);
    return true;
  }

  async moveTenantProduct(tenantId: string, productId: string, direction: -1 | 1): Promise<void> {
    const sorted = await this.listProductsByTenantId(tenantId);
    const idx = sorted.findIndex((p) => p.id === productId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= sorted.length) {
      return;
    }
    const a = sorted[idx];
    const b = sorted[j];
    await this.exec(`UPDATE tenant_products SET catalog_order = ? WHERE id = ?`, [
      b.catalogOrder,
      a.id,
    ]);
    await this.exec(`UPDATE tenant_products SET catalog_order = ? WHERE id = ?`, [
      a.catalogOrder,
      b.id,
    ]);
  }

  async listServicesByTenantId(tenantId: string): Promise<TenantServiceEntity[]> {
    const rows = await this.queryRows(
      `
        SELECT id, tenant_id, name, description, price, promo_price, promo_label, catalog_order
        FROM tenant_services
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapTenantServiceRow(row as Record<string, unknown>));
  }

  async createTenantService(
    tenantId: string,
    data: Omit<TenantServiceEntity, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantServiceEntity> {
    const id = `svc_${Date.now()}`;
    const rowOrder = await this.queryOne(
      `SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_services WHERE tenant_id = ?`,
      [tenantId],
    );
    const catalogOrder = Number(rowOrder?.next_order ?? 0);
    await this.exec(
      `
        INSERT INTO tenant_services (id, tenant_id, name, description, price, promo_price, promo_label, catalog_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        tenantId,
        data.name.trim(),
        data.description?.trim() || null,
        Math.max(0, Number(data.price) || 0),
        data.promoPrice == null ? null : Math.max(0, Number(data.promoPrice) || 0),
        data.promoLabel?.trim() || null,
        catalogOrder,
      ],
    );
    const list = await this.listServicesByTenantId(tenantId);
    return list.find((s) => s.id === id)!;
  }

  async updateTenantService(
    tenantId: string,
    serviceId: string,
    patch: Omit<Partial<TenantServiceEntity>, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantServiceEntity | undefined> {
    const list = await this.listServicesByTenantId(tenantId);
    const current = list.find((s) => s.id === serviceId);
    if (!current) {
      return undefined;
    }
    const next = {
      ...current,
      ...patch,
      name: patch.name?.trim() ?? current.name,
      description:
        patch.description === undefined ? current.description : patch.description?.trim() || null,
      price: patch.price === undefined ? current.price : Math.max(0, Number(patch.price) || 0),
      promoPrice:
        patch.promoPrice === undefined
          ? current.promoPrice
          : patch.promoPrice == null
            ? null
            : Math.max(0, Number(patch.promoPrice) || 0),
      promoLabel:
        patch.promoLabel === undefined ? current.promoLabel : patch.promoLabel?.trim() || null,
    };
    await this.exec(
      `
        UPDATE tenant_services
        SET name = ?, description = ?, price = ?, promo_price = ?, promo_label = ?
        WHERE id = ? AND tenant_id = ?
      `,
      [next.name, next.description, next.price, next.promoPrice, next.promoLabel, serviceId, tenantId],
    );
    const after = await this.listServicesByTenantId(tenantId);
    return after.find((s) => s.id === serviceId);
  }

  async deleteTenantService(tenantId: string, serviceId: string): Promise<boolean> {
    const list = await this.listServicesByTenantId(tenantId);
    const exists = list.some((s) => s.id === serviceId);
    if (!exists) {
      return false;
    }
    await this.exec(`DELETE FROM tenant_services WHERE id = ? AND tenant_id = ?`, [
      serviceId,
      tenantId,
    ]);
    return true;
  }

  async moveTenantService(tenantId: string, serviceId: string, direction: -1 | 1): Promise<void> {
    const sorted = await this.listServicesByTenantId(tenantId);
    const idx = sorted.findIndex((s) => s.id === serviceId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= sorted.length) {
      return;
    }
    const a = sorted[idx];
    const b = sorted[j];
    await this.exec(`UPDATE tenant_services SET catalog_order = ? WHERE id = ?`, [
      b.catalogOrder,
      a.id,
    ]);
    await this.exec(`UPDATE tenant_services SET catalog_order = ? WHERE id = ?`, [
      a.catalogOrder,
      b.id,
    ]);
  }

  private async columnExists(table: string, column: string): Promise<boolean> {
    if (this.dialect === 'sqlite') {
      const allowed = new Set([
        'appointments',
        'tenants',
        'users',
        'store_visit_logs',
        'tenant_branding',
        'tenant_products',
        'tenant_services',
      ]);
      if (!allowed.has(table)) {
        return false;
      }
      const rows = this.sqliteDb!.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      return rows.some((c) => c.name === column);
    }
    const row = await this.queryOne(
      `
        SELECT COLUMN_NAME AS name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
      `,
      [table, column],
    );
    return Boolean(row);
  }

  private async ensureSchemaMigrations(): Promise<void> {
    if (this.dialect === 'sqlite') {
      if (!(await this.columnExists('appointments', 'attendance'))) {
        this.sqliteDb!.exec(
          `ALTER TABLE appointments ADD COLUMN attendance TEXT NOT NULL DEFAULT 'PENDIENTE'`,
        );
      }
      const tenantHasCol = (col: string) =>
        (this.sqliteDb!.prepare(`PRAGMA table_info(tenants)`).all() as { name: string }[]).some(
          (c) => c.name === col,
        );
      if (!tenantHasCol('plan')) {
        this.sqliteDb!.exec(`ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'Trial'`);
      }
      if (!tenantHasCol('storefront_enabled')) {
        this.sqliteDb!.exec(
          `ALTER TABLE tenants ADD COLUMN storefront_enabled INTEGER NOT NULL DEFAULT 0`,
        );
      }
      if (!tenantHasCol('manual_booking_enabled')) {
        this.sqliteDb!.exec(
          `ALTER TABLE tenants ADD COLUMN manual_booking_enabled INTEGER NOT NULL DEFAULT 1`,
        );
      }
      const tenants = this.sqliteDb!.prepare(`SELECT id, name FROM tenants`).all() as Array<{
        id: string;
        name: string;
      }>;
      for (const t of tenants) {
        await this.ensureTenantBranding(String(t.id), String(t.name));
      }
      return;
    }
    if (!(await this.columnExists('appointments', 'attendance'))) {
      await this.execScript(
        `ALTER TABLE appointments ADD COLUMN attendance TEXT NOT NULL DEFAULT 'PENDIENTE'`,
      );
    }

    if (!(await this.columnExists('tenants', 'plan'))) {
      await this.execScript(`ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'Trial'`);
    }
    if (!(await this.columnExists('tenants', 'storefront_enabled'))) {
      await this.execScript(
        `ALTER TABLE tenants ADD COLUMN storefront_enabled BOOLEAN NOT NULL DEFAULT false`,
      );
    }
    if (!(await this.columnExists('tenants', 'manual_booking_enabled'))) {
      await this.execScript(
        `ALTER TABLE tenants ADD COLUMN manual_booking_enabled BOOLEAN NOT NULL DEFAULT true`,
      );
    }

    const tenantRows = await this.queryRows(`SELECT id, name FROM tenants`);
    for (const t of tenantRows) {
      await this.ensureTenantBranding(String(t.id), String(t.name));
    }
  }

  private async createSchema(): Promise<void> {
    if (this.dialect === 'sqlite') {
      this.sqliteDb!.exec(SQLITE_INITIAL_SCHEMA);
      this.sqliteDb!.exec('PRAGMA foreign_keys = ON');
      return;
    }
    await this.execScript(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'Trial',
        storefront_enabled BOOLEAN NOT NULL DEFAULT false,
        manual_booking_enabled BOOLEAN NOT NULL DEFAULT true,
        citas_enabled BOOLEAN NOT NULL DEFAULT true,
        ventas_enabled BOOLEAN NOT NULL DEFAULT true,
        inventario_enabled BOOLEAN NOT NULL DEFAULT false
      )
    `);

    await this.execScript(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        tenant_id TEXT NULL,
        systems TEXT NOT NULL,
        status TEXT NOT NULL,
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      )
    `);

    await this.execScript(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer TEXT NOT NULL,
        service TEXT NOT NULL,
        when_at TEXT NOT NULL,
        status TEXT NOT NULL,
        attendance TEXT NOT NULL DEFAULT 'PENDIENTE',
        CONSTRAINT fk_appt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    await this.ensureIndex(`CREATE INDEX idx_appointments_tenant_when ON appointments (tenant_id, when_at)`);

    await this.execScript(`
      CREATE TABLE IF NOT EXISTS store_visit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL,
        CONSTRAINT fk_visit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    await this.ensureIndex(
      `CREATE INDEX idx_store_visits_tenant_created ON store_visit_logs (tenant_id, created_at)`,
    );

    await this.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_branding (
        tenant_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        logo_url TEXT NULL,
        catalog_layout TEXT NOT NULL DEFAULT 'horizontal',
        primary_color TEXT NOT NULL DEFAULT '#4f46e5',
        accent_color TEXT NOT NULL DEFAULT '#06b6d4',
        bg_color TEXT NOT NULL DEFAULT '#f8fafc',
        surface_color TEXT NOT NULL DEFAULT '#ffffff',
        text_color TEXT NOT NULL DEFAULT '#0f172a',
        border_radius_px INT NOT NULL DEFAULT 12,
        use_gradient BOOLEAN NOT NULL DEFAULT false,
        gradient_from TEXT NOT NULL DEFAULT '#4f46e5',
        gradient_to TEXT NOT NULL DEFAULT '#06b6d4',
        gradient_angle_deg INT NOT NULL DEFAULT 135,
        CONSTRAINT fk_branding_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    await this.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_products (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        promo_price NUMERIC(12,2) NULL,
        sku TEXT NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        catalog_order INT NOT NULL DEFAULT 0,
        image_url TEXT NULL,
        CONSTRAINT fk_product_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    await this.ensureIndex(
      `CREATE INDEX idx_tenant_products_tenant_order ON tenant_products (tenant_id, catalog_order)`,
    );

    await this.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_services (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        promo_price NUMERIC(12,2) NULL,
        promo_label TEXT NULL,
        catalog_order INT NOT NULL DEFAULT 0,
        CONSTRAINT fk_service_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    await this.ensureIndex(
      `CREATE INDEX idx_tenant_services_tenant_order ON tenant_services (tenant_id, catalog_order)`,
    );
  }

  private async seedIfEmpty(): Promise<void> {
    const countRow = await this.queryOne(`SELECT COUNT(*) AS cnt FROM users`);
    const count = Number(countRow?.cnt ?? 0);
    if (count > 0) {
      return;
    }

    await this.ensureSeedTenant({
      id: 'tenant_spa',
      name: 'Spa Relax',
      slug: 'spa-relax',
      status: 'ACTIVE',
      plan: 'Básico',
      storefrontEnabled: false,
      modules: { citas: true, ventas: true, inventario: false },
    });
    await this.ensureSeedTenant({
      id: 'tenant_clinica',
      name: 'Clinica Demo',
      slug: 'clinica-demo',
      status: 'PAUSED',
      plan: 'Pro',
      storefrontEnabled: false,
      modules: { citas: true, ventas: true, inventario: true },
    });
    await this.ensureSeedTenant({
      id: 'tenant_barberia',
      name: 'Barberia Centro',
      slug: 'barberia-centro',
      status: 'ACTIVE',
      plan: 'Pro',
      storefrontEnabled: true,
      modules: { citas: true, ventas: true, inventario: true },
    });

    await this.ensureSeedUser({
      id: 'usr_super_1',
      email: 'super@azenda.dev',
      password: 'azenda123',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      systems: [AppSystem.SUPER_ADMIN, AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    });
    await this.ensureSeedUser({
      id: 'usr_admin_spa',
      email: 'admin-spa@azenda.dev',
      password: 'azenda123',
      role: UserRole.ADMIN,
      tenantId: 'tenant_spa',
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    });
    await this.ensureSeedUser({
      id: 'usr_admin_clinica',
      email: 'admin-clinica@azenda.dev',
      password: 'azenda123',
      role: UserRole.ADMIN,
      tenantId: 'tenant_clinica',
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'PAUSED',
    });
    await this.ensureSeedUser({
      id: 'usr_employee_1',
      email: 'empleado@azenda.dev',
      password: 'azenda123',
      role: UserRole.EMPLEADO,
      tenantId: 'tenant_barberia',
      systems: [AppSystem.TENANT],
      status: 'ACTIVE',
    });
  }

  private async ensureSeedTenant(
    row: Omit<TenantEntity, 'manualBookingEnabled'> & {
      manualBookingEnabled?: boolean;
    },
  ): Promise<void> {
    const exists = await this.findTenantById(row.id);
    if (exists) {
      return;
    }
    await this.createTenant(row);
  }

  private async ensureSeedUser(row: UserEntity): Promise<void> {
    const exists = await this.findUserById(row.id);
    if (exists) {
      return;
    }
    await this.createUser(row);
  }

  private async ensureTenantBranding(tenantId: string, tenantName: string): Promise<TenantBrandingEntity> {
    const existing = await this.queryOne(
      `
        SELECT tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `,
      [tenantId],
    );
    if (existing) {
      return this.mapTenantBrandingRow(existing);
    }
    await this.exec(
      `
        INSERT INTO tenant_branding (
          tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
          border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        ) VALUES (?, ?, ?, 'horizontal', '#4f46e5', '#06b6d4', '#f8fafc', '#ffffff', '#0f172a', 12, false, '#4f46e5', '#06b6d4', 135)
      `,
      [tenantId, tenantName, null],
    );
    return await this.getTenantBranding(tenantId);
  }

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

  private mapTenantRow(row: Record<string, unknown>): TenantEntity {
    const planRaw = row.plan;
    const plan = typeof planRaw === 'string' && planRaw.length ? planRaw : 'Trial';
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      status: row.status as TenantEntity['status'],
      plan,
      storefrontEnabled: Boolean(row.storefront_enabled),
      manualBookingEnabled: Boolean(row.manual_booking_enabled),
      modules: {
        citas: Boolean(row.citas_enabled),
        ventas: Boolean(row.ventas_enabled),
        inventario: Boolean(row.inventario_enabled),
      },
    };
  }

  private mapAppointmentRow(row: Record<string, unknown>): AppointmentEntity {
    const attendanceRaw = row.attendance;
    const attendance =
      attendanceRaw === 'ASISTIO' ||
      attendanceRaw === 'NO_ASISTIO' ||
      attendanceRaw === 'PENDIENTE'
        ? (attendanceRaw as AppointmentAttendance)
        : 'PENDIENTE';
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      customer: String(row.customer),
      service: String(row.service),
      when: String(row.when_at),
      status: row.status as AppointmentStatus,
      attendance,
    };
  }

  private mapStoreVisitRow(row: Record<string, unknown>): StoreVisitLogEntity {
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      customer: String(row.customer),
      detail: String(row.detail),
      createdAt: String(row.created_at),
    };
  }

  private mapTenantBrandingRow(row: Record<string, unknown>): TenantBrandingEntity {
    return {
      tenantId: String(row.tenant_id),
      displayName: String(row.display_name ?? ''),
      logoUrl: row.logo_url == null ? null : String(row.logo_url),
      catalogLayout: row.catalog_layout === 'grid' ? 'grid' : 'horizontal',
      primaryColor: String(row.primary_color),
      accentColor: String(row.accent_color),
      bgColor: String(row.bg_color),
      surfaceColor: String(row.surface_color),
      textColor: String(row.text_color),
      borderRadiusPx: Math.max(4, Math.min(28, Number(row.border_radius_px) || 12)),
      useGradient: Boolean(row.use_gradient),
      gradientFrom: String(row.gradient_from),
      gradientTo: String(row.gradient_to),
      gradientAngleDeg: Math.max(0, Math.min(360, Number(row.gradient_angle_deg) || 135)),
    };
  }

  private mapTenantProductRow(row: Record<string, unknown>): TenantProductEntity {
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      name: String(row.name),
      description: row.description == null ? null : String(row.description),
      price: Math.max(0, Number(row.price) || 0),
      promoPrice: row.promo_price == null ? null : Math.max(0, Number(row.promo_price) || 0),
      sku: String(row.sku),
      stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
      catalogOrder: Number(row.catalog_order) || 0,
      imageUrl: row.image_url == null ? null : String(row.image_url),
    };
  }

  private mapTenantServiceRow(row: Record<string, unknown>): TenantServiceEntity {
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      name: String(row.name),
      description: row.description == null ? null : String(row.description),
      price: Math.max(0, Number(row.price) || 0),
      promoPrice: row.promo_price == null ? null : Math.max(0, Number(row.promo_price) || 0),
      promoLabel: row.promo_label == null ? null : String(row.promo_label),
      catalogOrder: Number(row.catalog_order) || 0,
    };
  }
}
