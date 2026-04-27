import { Injectable } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppSystem, UserRole } from '../../auth/auth.types';
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

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => void;
    get: (...params: unknown[]) => Record<string, unknown> | undefined;
    all: (...params: unknown[]) => Array<Record<string, unknown>>;
  };
};

type SqliteModule = {
  DatabaseSync: new (path: string) => SqliteDatabase;
};

@Injectable()
export class SqlDbService {
  private readonly db: SqliteDatabase;

  constructor() {
    const dbPath = resolve(process.cwd(), 'data', 'azenda.db');
    mkdirSync(dirname(dbPath), { recursive: true });

    const sqlite = require('node:sqlite') as SqliteModule;
    this.db = new sqlite.DatabaseSync(dbPath);

    this.createSchema();
    this.db.exec('PRAGMA foreign_keys = ON');
    this.ensureSchemaMigrations();
    this.seedIfEmpty();
  }

  findUserByCredentials(email: string, password: string): UserEntity | undefined {
    const normalizedEmail = email.trim().toLowerCase();
    const row = this.db
      .prepare(
        `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE LOWER(TRIM(email)) = ? AND password = ?
      `,
      )
      .get(normalizedEmail, password);

    return row ? this.mapUserRow(row) : undefined;
  }

  findUserById(userId: string): UserEntity | undefined {
    const row = this.db
      .prepare(
        `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE id = ?
      `,
      )
      .get(userId);

    return row ? this.mapUserRow(row) : undefined;
  }

  listUsers(): UserEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        ORDER BY email ASC
      `,
      )
      .all();

    return rows.map((row) => this.mapUserRow(row));
  }

  listUsersByTenantId(tenantId: string): UserEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE tenant_id = ?
        ORDER BY email ASC
      `,
      )
      .all(tenantId);
    return rows.map((row) => this.mapUserRow(row));
  }

  createUser(data: UserEntity): UserEntity {
    this.db
      .prepare(
        `
        INSERT INTO users (id, email, password, role, tenant_id, systems, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        data.id,
        data.email,
        data.password,
        data.role,
        data.tenantId,
        JSON.stringify(data.systems),
        data.status,
      );

    return data;
  }

  updateUser(
    userId: string,
    patch: Partial<Omit<UserEntity, 'id'>>,
  ): UserEntity | undefined {
    const current = this.findUserById(userId);
    if (!current) {
      return undefined;
    }

    const next: UserEntity = {
      ...current,
      ...patch,
      systems: patch.systems ?? current.systems,
    };

    this.db
      .prepare(
        `
        UPDATE users
        SET email = ?, password = ?, role = ?, tenant_id = ?, systems = ?, status = ?
        WHERE id = ?
      `,
      )
      .run(
        next.email,
        next.password,
        next.role,
        next.tenantId,
        JSON.stringify(next.systems),
        next.status,
        userId,
      );

    return next;
  }

  deleteUser(userId: string): boolean {
    const existing = this.findUserById(userId);
    if (!existing) {
      return false;
    }

    this.db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
    return true;
  }

  deleteUserByTenant(userId: string, tenantId: string): boolean {
    const existing = this.findUserById(userId);
    if (!existing || existing.tenantId !== tenantId) {
      return false;
    }
    this.db.prepare(`DELETE FROM users WHERE id = ? AND tenant_id = ?`).run(userId, tenantId);
    return true;
  }

  listTenants(): TenantEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        ORDER BY name ASC
      `,
      )
      .all();

    return rows.map((row) => this.mapTenantRow(row));
  }

  findTenantBySlug(slug: string): TenantEntity | undefined {
    const row = this.db
      .prepare(
        `
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        WHERE slug = ?
      `,
      )
      .get(slug);

    return row ? this.mapTenantRow(row) : undefined;
  }

  findTenantById(tenantId: string): TenantEntity | undefined {
    const row = this.db
      .prepare(
        `
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        WHERE id = ?
      `,
      )
      .get(tenantId);

    return row ? this.mapTenantRow(row) : undefined;
  }

  createTenant(
    data: Omit<TenantEntity, 'manualBookingEnabled'> & {
      manualBookingEnabled?: boolean;
    },
  ): TenantEntity {
    const row: TenantEntity = {
      ...data,
      plan: data.plan ?? 'Trial',
      storefrontEnabled: data.storefrontEnabled ?? false,
      manualBookingEnabled: data.manualBookingEnabled ?? true,
    };
    this.db
      .prepare(
        `
        INSERT INTO tenants (
          id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        row.id,
        row.name,
        row.slug,
        row.status,
        row.plan,
        row.storefrontEnabled ? 1 : 0,
        row.manualBookingEnabled ? 1 : 0,
        row.modules.citas ? 1 : 0,
        row.modules.ventas ? 1 : 0,
        row.modules.inventario ? 1 : 0,
      );

    this.ensureTenantBranding(row.id, row.name);
    return row;
  }

  updateTenant(
    tenantId: string,
    patch: Omit<Partial<TenantEntity>, 'modules'> & {
      modules?: Partial<TenantEntity['modules']>;
    },
  ): TenantEntity | undefined {
    const current = this.findTenantById(tenantId);
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
        patch.storefrontEnabled !== undefined
          ? patch.storefrontEnabled
          : current.storefrontEnabled,
      manualBookingEnabled:
        patch.manualBookingEnabled !== undefined
          ? patch.manualBookingEnabled
          : current.manualBookingEnabled,
      modules: {
        ...current.modules,
        ...(patch.modules ?? {}),
      },
    };

    this.db
      .prepare(
        `
        UPDATE tenants
        SET name = ?, slug = ?, status = ?, plan = ?, storefront_enabled = ?, manual_booking_enabled = ?,
            citas_enabled = ?, ventas_enabled = ?, inventario_enabled = ?
        WHERE id = ?
      `,
      )
      .run(
        next.name,
        next.slug,
        next.status,
        next.plan,
        next.storefrontEnabled ? 1 : 0,
        next.manualBookingEnabled ? 1 : 0,
        next.modules.citas ? 1 : 0,
        next.modules.ventas ? 1 : 0,
        next.modules.inventario ? 1 : 0,
        tenantId,
      );

    return next;
  }

  deleteTenant(tenantId: string): boolean {
    const existing = this.findTenantById(tenantId);
    if (!existing) {
      return false;
    }

    this.db.prepare(`DELETE FROM tenants WHERE id = ?`).run(tenantId);
    return true;
  }

  listAppointmentsByTenantId(tenantId: string): AppointmentEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE tenant_id = ?
        ORDER BY when_at ASC
      `,
      )
      .all(tenantId);

    return rows.map((row) => this.mapAppointmentRow(row));
  }

  createAppointment(data: {
    tenantId: string;
    customer: string;
    service: string;
    when: string;
    status?: AppointmentStatus;
    attendance?: AppointmentAttendance;
  }): AppointmentEntity {
    const id = `appt_${Date.now()}`;
    const status = data.status ?? 'pendiente';
    const attendance = data.attendance ?? 'PENDIENTE';
    this.db
      .prepare(
        `
        INSERT INTO appointments (id, tenant_id, customer, service, when_at, status, attendance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(id, data.tenantId, data.customer, data.service, data.when, status, attendance);

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

  findAppointmentById(appointmentId: string): AppointmentEntity | undefined {
    const row = this.db
      .prepare(
        `
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE id = ?
      `,
      )
      .get(appointmentId);

    return row ? this.mapAppointmentRow(row) : undefined;
  }

  updateAppointmentStatus(
    appointmentId: string,
    tenantId: string,
    status: AppointmentStatus,
  ): AppointmentEntity | undefined {
    const current = this.findAppointmentById(appointmentId);
    if (!current || current.tenantId !== tenantId) {
      return undefined;
    }
    this.db
      .prepare(
        `
        UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?
      `,
      )
      .run(status, appointmentId, tenantId);
    return { ...current, status };
  }

  updateAppointmentAttendance(
    appointmentId: string,
    tenantId: string,
    attendance: AppointmentAttendance,
  ): AppointmentEntity | undefined {
    const current = this.findAppointmentById(appointmentId);
    if (!current || current.tenantId !== tenantId) {
      return undefined;
    }
    const status: AppointmentStatus =
      attendance === 'ASISTIO'
        ? 'confirmada'
        : attendance === 'NO_ASISTIO'
          ? 'cancelada'
          : 'pendiente';
    this.db
      .prepare(
        `
        UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?
      `,
      )
      .run(attendance, status, appointmentId, tenantId);
    return { ...current, attendance, status };
  }

  /**
   * Cliente confirma que acudió a la cita (nombre debe coincidir con la reserva).
   */
  confirmPublicAppointmentAttendance(
    slug: string,
    appointmentId: string,
    customerName: string,
  ): AppointmentEntity | undefined {
    const tenant = this.findTenantBySlug(slug);
    if (!tenant || tenant.status !== 'ACTIVE' || !tenant.modules.citas) {
      return undefined;
    }
    const appt = this.findAppointmentById(appointmentId);
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
    this.db
      .prepare(
        `
        UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?
      `,
      )
      .run('ASISTIO', 'confirmada', appointmentId, tenant.id);
    return { ...appt, attendance: 'ASISTIO', status: 'confirmada' };
  }

  listStoreVisitsByTenantId(tenantId: string): StoreVisitLogEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tenant_id, customer, detail, created_at
        FROM store_visit_logs
        WHERE tenant_id = ?
        ORDER BY datetime(created_at) DESC
      `,
      )
      .all(tenantId);

    return rows.map((row) => this.mapStoreVisitRow(row));
  }

  createStoreVisitLog(data: {
    tenantId: string;
    customer: string;
    detail: string;
  }): StoreVisitLogEntity {
    const id = `visit_${Date.now()}`;
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        `
        INSERT INTO store_visit_logs (id, tenant_id, customer, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      )
      .run(id, data.tenantId, data.customer, data.detail, createdAt);

    return {
      id,
      tenantId: data.tenantId,
      customer: data.customer,
      detail: data.detail,
      createdAt,
    };
  }

  getTenantBranding(tenantId: string): TenantBrandingEntity {
    const row = this.db
      .prepare(
        `
        SELECT tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `,
      )
      .get(tenantId);
    if (row) {
      return this.mapTenantBrandingRow(row);
    }
    const tenant = this.findTenantById(tenantId);
    return this.ensureTenantBranding(tenantId, tenant?.name ?? 'Tu negocio');
  }

  updateTenantBranding(
    tenantId: string,
    patch: Partial<Omit<TenantBrandingEntity, 'tenantId'>>,
  ): TenantBrandingEntity {
    const current = this.getTenantBranding(tenantId);
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
    this.db
      .prepare(
        `
        UPDATE tenant_branding
        SET display_name = ?, logo_url = ?, catalog_layout = ?, primary_color = ?, accent_color = ?, bg_color = ?, surface_color = ?, text_color = ?,
            border_radius_px = ?, use_gradient = ?, gradient_from = ?, gradient_to = ?, gradient_angle_deg = ?
        WHERE tenant_id = ?
      `,
      )
      .run(
        next.displayName,
        next.logoUrl,
        next.catalogLayout,
        next.primaryColor,
        next.accentColor,
        next.bgColor,
        next.surfaceColor,
        next.textColor,
        Math.round(next.borderRadiusPx),
        next.useGradient ? 1 : 0,
        next.gradientFrom,
        next.gradientTo,
        Math.round(next.gradientAngleDeg),
        tenantId,
      );
    return next;
  }

  listProductsByTenantId(tenantId: string): TenantProductEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url
        FROM tenant_products
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `,
      )
      .all(tenantId);
    return rows.map((row) => this.mapTenantProductRow(row));
  }

  createTenantProduct(
    tenantId: string,
    data: Omit<TenantProductEntity, 'id' | 'tenantId' | 'catalogOrder'>,
  ): TenantProductEntity {
    const id = `prd_${Date.now()}`;
    const rowOrder = this.db
      .prepare(`SELECT COALESCE(MAX(catalog_order), -1) + 1 as next_order FROM tenant_products WHERE tenant_id = ?`)
      .get(tenantId);
    const catalogOrder = Number(rowOrder?.next_order ?? 0);
    this.db
      .prepare(
        `
        INSERT INTO tenant_products (id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
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
      );
    return this.listProductsByTenantId(tenantId).find((p) => p.id === id)!;
  }

  updateTenantProduct(
    tenantId: string,
    productId: string,
    patch: Omit<Partial<TenantProductEntity>, 'id' | 'tenantId' | 'catalogOrder'>,
  ): TenantProductEntity | undefined {
    const current = this.listProductsByTenantId(tenantId).find((p) => p.id === productId);
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
    this.db
      .prepare(
        `
        UPDATE tenant_products
        SET name = ?, description = ?, price = ?, promo_price = ?, sku = ?, stock = ?, image_url = ?
        WHERE id = ? AND tenant_id = ?
      `,
      )
      .run(
        next.name,
        next.description,
        next.price,
        next.promoPrice,
        next.sku,
        next.stock,
        next.imageUrl,
        productId,
        tenantId,
      );
    return this.listProductsByTenantId(tenantId).find((p) => p.id === productId);
  }

  deleteTenantProduct(tenantId: string, productId: string): boolean {
    const exists = this.listProductsByTenantId(tenantId).some((p) => p.id === productId);
    if (!exists) {
      return false;
    }
    this.db.prepare(`DELETE FROM tenant_products WHERE id = ? AND tenant_id = ?`).run(productId, tenantId);
    return true;
  }

  moveTenantProduct(tenantId: string, productId: string, direction: -1 | 1): void {
    const sorted = this.listProductsByTenantId(tenantId);
    const idx = sorted.findIndex((p) => p.id === productId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= sorted.length) {
      return;
    }
    const a = sorted[idx];
    const b = sorted[j];
    this.db.prepare(`UPDATE tenant_products SET catalog_order = ? WHERE id = ?`).run(
      b.catalogOrder,
      a.id,
    );
    this.db.prepare(`UPDATE tenant_products SET catalog_order = ? WHERE id = ?`).run(
      a.catalogOrder,
      b.id,
    );
  }

  listServicesByTenantId(tenantId: string): TenantServiceEntity[] {
    const rows = this.db
      .prepare(
        `
        SELECT id, tenant_id, name, description, price, promo_price, promo_label, catalog_order
        FROM tenant_services
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `,
      )
      .all(tenantId);
    return rows.map((row) => this.mapTenantServiceRow(row));
  }

  createTenantService(
    tenantId: string,
    data: Omit<TenantServiceEntity, 'id' | 'tenantId' | 'catalogOrder'>,
  ): TenantServiceEntity {
    const id = `svc_${Date.now()}`;
    const rowOrder = this.db
      .prepare(`SELECT COALESCE(MAX(catalog_order), -1) + 1 as next_order FROM tenant_services WHERE tenant_id = ?`)
      .get(tenantId);
    const catalogOrder = Number(rowOrder?.next_order ?? 0);
    this.db
      .prepare(
        `
        INSERT INTO tenant_services (id, tenant_id, name, description, price, promo_price, promo_label, catalog_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        id,
        tenantId,
        data.name.trim(),
        data.description?.trim() || null,
        Math.max(0, Number(data.price) || 0),
        data.promoPrice == null ? null : Math.max(0, Number(data.promoPrice) || 0),
        data.promoLabel?.trim() || null,
        catalogOrder,
      );
    return this.listServicesByTenantId(tenantId).find((s) => s.id === id)!;
  }

  updateTenantService(
    tenantId: string,
    serviceId: string,
    patch: Omit<Partial<TenantServiceEntity>, 'id' | 'tenantId' | 'catalogOrder'>,
  ): TenantServiceEntity | undefined {
    const current = this.listServicesByTenantId(tenantId).find((s) => s.id === serviceId);
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
    this.db
      .prepare(
        `
        UPDATE tenant_services
        SET name = ?, description = ?, price = ?, promo_price = ?, promo_label = ?
        WHERE id = ? AND tenant_id = ?
      `,
      )
      .run(
        next.name,
        next.description,
        next.price,
        next.promoPrice,
        next.promoLabel,
        serviceId,
        tenantId,
      );
    return this.listServicesByTenantId(tenantId).find((s) => s.id === serviceId);
  }

  deleteTenantService(tenantId: string, serviceId: string): boolean {
    const exists = this.listServicesByTenantId(tenantId).some((s) => s.id === serviceId);
    if (!exists) {
      return false;
    }
    this.db.prepare(`DELETE FROM tenant_services WHERE id = ? AND tenant_id = ?`).run(serviceId, tenantId);
    return true;
  }

  moveTenantService(tenantId: string, serviceId: string, direction: -1 | 1): void {
    const sorted = this.listServicesByTenantId(tenantId);
    const idx = sorted.findIndex((s) => s.id === serviceId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= sorted.length) {
      return;
    }
    const a = sorted[idx];
    const b = sorted[j];
    this.db.prepare(`UPDATE tenant_services SET catalog_order = ? WHERE id = ?`).run(
      b.catalogOrder,
      a.id,
    );
    this.db.prepare(`UPDATE tenant_services SET catalog_order = ? WHERE id = ?`).run(
      a.catalogOrder,
      b.id,
    );
  }

  private ensureSchemaMigrations(): void {
    const cols = this.db
      .prepare(`PRAGMA table_info(appointments)`)
      .all() as { name: string }[];
    if (!cols.some((c) => c.name === 'attendance')) {
      this.db.exec(
        `ALTER TABLE appointments ADD COLUMN attendance TEXT NOT NULL DEFAULT 'PENDIENTE'`,
      );
    }

    const tcols = this.db
      .prepare(`PRAGMA table_info(tenants)`)
      .all() as { name: string }[];
    if (!tcols.some((c) => c.name === 'plan')) {
      this.db.exec(`ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'Trial'`);
    }
    if (!tcols.some((c) => c.name === 'storefront_enabled')) {
      this.db.exec(
        `ALTER TABLE tenants ADD COLUMN storefront_enabled INTEGER NOT NULL DEFAULT 0`,
      );
    }
    if (!tcols.some((c) => c.name === 'manual_booking_enabled')) {
      this.db.exec(
        `ALTER TABLE tenants ADD COLUMN manual_booking_enabled INTEGER NOT NULL DEFAULT 1`,
      );
    }

    const tenants = this.db
      .prepare(`SELECT id, name FROM tenants`)
      .all() as Array<{ id: string; name: string }>;
    for (const t of tenants) {
      this.ensureTenantBranding(String(t.id), String(t.name));
    }
  }

  private createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'Trial',
        storefront_enabled INTEGER NOT NULL DEFAULT 0,
        manual_booking_enabled INTEGER NOT NULL DEFAULT 1,
        citas_enabled INTEGER NOT NULL DEFAULT 1,
        ventas_enabled INTEGER NOT NULL DEFAULT 1,
        inventario_enabled INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        tenant_id TEXT,
        systems TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer TEXT NOT NULL,
        service TEXT NOT NULL,
        when_at TEXT NOT NULL,
        status TEXT NOT NULL,
        attendance TEXT NOT NULL DEFAULT 'PENDIENTE',
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_appointments_tenant_when
        ON appointments(tenant_id, when_at);

      CREATE TABLE IF NOT EXISTS store_visit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_store_visits_tenant_created
        ON store_visit_logs(tenant_id, created_at);

      CREATE TABLE IF NOT EXISTS tenant_branding (
        tenant_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        logo_url TEXT,
        catalog_layout TEXT NOT NULL DEFAULT 'horizontal',
        primary_color TEXT NOT NULL DEFAULT '#4f46e5',
        accent_color TEXT NOT NULL DEFAULT '#06b6d4',
        bg_color TEXT NOT NULL DEFAULT '#f8fafc',
        surface_color TEXT NOT NULL DEFAULT '#ffffff',
        text_color TEXT NOT NULL DEFAULT '#0f172a',
        border_radius_px INTEGER NOT NULL DEFAULT 12,
        use_gradient INTEGER NOT NULL DEFAULT 0,
        gradient_from TEXT NOT NULL DEFAULT '#4f46e5',
        gradient_to TEXT NOT NULL DEFAULT '#06b6d4',
        gradient_angle_deg INTEGER NOT NULL DEFAULT 135,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tenant_products (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        promo_price REAL,
        sku TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        catalog_order INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tenant_products_tenant_order
        ON tenant_products(tenant_id, catalog_order);

      CREATE TABLE IF NOT EXISTS tenant_services (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL DEFAULT 0,
        promo_price REAL,
        promo_label TEXT,
        catalog_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tenant_services_tenant_order
        ON tenant_services(tenant_id, catalog_order);
    `);
  }

  private seedIfEmpty() {
    const countRow = this.db.prepare(`SELECT COUNT(*) as count FROM users`).get();
    const count = Number(countRow?.count ?? 0);
    if (count > 0) {
      return;
    }

    this.createTenant({
      id: 'tenant_spa',
      name: 'Spa Relax',
      slug: 'spa-relax',
      status: 'ACTIVE',
      plan: 'Básico',
      storefrontEnabled: false,
      modules: { citas: true, ventas: true, inventario: false },
    });
    this.createTenant({
      id: 'tenant_clinica',
      name: 'Clinica Demo',
      slug: 'clinica-demo',
      status: 'PAUSED',
      plan: 'Pro',
      storefrontEnabled: false,
      modules: { citas: true, ventas: true, inventario: true },
    });
    this.createTenant({
      id: 'tenant_barberia',
      name: 'Barberia Centro',
      slug: 'barberia-centro',
      status: 'ACTIVE',
      plan: 'Pro',
      storefrontEnabled: true,
      modules: { citas: true, ventas: true, inventario: true },
    });

    this.createUser({
      id: 'usr_super_1',
      email: 'super@azenda.dev',
      password: 'azenda123',
      role: UserRole.SUPER_ADMIN,
      tenantId: null,
      systems: [AppSystem.SUPER_ADMIN, AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    });
    this.createUser({
      id: 'usr_admin_spa',
      email: 'admin-spa@azenda.dev',
      password: 'azenda123',
      role: UserRole.ADMIN,
      tenantId: 'tenant_spa',
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    });
    this.createUser({
      id: 'usr_admin_clinica',
      email: 'admin-clinica@azenda.dev',
      password: 'azenda123',
      role: UserRole.ADMIN,
      tenantId: 'tenant_clinica',
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'PAUSED',
    });
    this.createUser({
      id: 'usr_employee_1',
      email: 'empleado@azenda.dev',
      password: 'azenda123',
      role: UserRole.EMPLEADO,
      tenantId: 'tenant_barberia',
      systems: [AppSystem.TENANT],
      status: 'ACTIVE',
    });
  }

  private ensureTenantBranding(tenantId: string, tenantName: string): TenantBrandingEntity {
    const existing = this.db
      .prepare(
        `
        SELECT tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `,
      )
      .get(tenantId);
    if (existing) {
      return this.mapTenantBrandingRow(existing);
    }
    this.db
      .prepare(
        `
        INSERT INTO tenant_branding (
          tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
          border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        ) VALUES (?, ?, ?, 'horizontal', '#4f46e5', '#06b6d4', '#f8fafc', '#ffffff', '#0f172a', 12, 0, '#4f46e5', '#06b6d4', 135)
      `,
      )
      .run(tenantId, tenantName, null);
    return this.getTenantBranding(tenantId);
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
    const plan =
      typeof planRaw === 'string' && planRaw.length ? planRaw : 'Trial';
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      status: row.status as TenantEntity['status'],
      plan,
      storefrontEnabled: Number(row.storefront_enabled) === 1,
      manualBookingEnabled: Number(row.manual_booking_enabled) === 1,
      modules: {
        citas: Number(row.citas_enabled) === 1,
        ventas: Number(row.ventas_enabled) === 1,
        inventario: Number(row.inventario_enabled) === 1,
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
      useGradient: Number(row.use_gradient) === 1,
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
