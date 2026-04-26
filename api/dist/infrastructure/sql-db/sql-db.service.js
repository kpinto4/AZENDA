"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDbService = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const auth_types_1 = require("../../auth/auth.types");
let SqlDbService = class SqlDbService {
    constructor() {
        const dbPath = (0, node_path_1.resolve)(process.cwd(), 'data', 'azenda.db');
        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(dbPath), { recursive: true });
        const sqlite = require('node:sqlite');
        this.db = new sqlite.DatabaseSync(dbPath);
        this.createSchema();
        this.db.exec('PRAGMA foreign_keys = ON');
        this.ensureSchemaMigrations();
        this.seedIfEmpty();
    }
    findUserByCredentials(email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const row = this.db
            .prepare(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE LOWER(TRIM(email)) = ? AND password = ?
      `)
            .get(normalizedEmail, password);
        return row ? this.mapUserRow(row) : undefined;
    }
    findUserById(userId) {
        const row = this.db
            .prepare(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE id = ?
      `)
            .get(userId);
        return row ? this.mapUserRow(row) : undefined;
    }
    listUsers() {
        const rows = this.db
            .prepare(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        ORDER BY email ASC
      `)
            .all();
        return rows.map((row) => this.mapUserRow(row));
    }
    createUser(data) {
        this.db
            .prepare(`
        INSERT INTO users (id, email, password, role, tenant_id, systems, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
            .run(data.id, data.email, data.password, data.role, data.tenantId, JSON.stringify(data.systems), data.status);
        return data;
    }
    updateUser(userId, patch) {
        const current = this.findUserById(userId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            ...patch,
            systems: patch.systems ?? current.systems,
        };
        this.db
            .prepare(`
        UPDATE users
        SET email = ?, password = ?, role = ?, tenant_id = ?, systems = ?, status = ?
        WHERE id = ?
      `)
            .run(next.email, next.password, next.role, next.tenantId, JSON.stringify(next.systems), next.status, userId);
        return next;
    }
    deleteUser(userId) {
        const existing = this.findUserById(userId);
        if (!existing) {
            return false;
        }
        this.db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);
        return true;
    }
    listTenants() {
        const rows = this.db
            .prepare(`
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        ORDER BY name ASC
      `)
            .all();
        return rows.map((row) => this.mapTenantRow(row));
    }
    findTenantBySlug(slug) {
        const row = this.db
            .prepare(`
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        WHERE slug = ?
      `)
            .get(slug);
        return row ? this.mapTenantRow(row) : undefined;
    }
    findTenantById(tenantId) {
        const row = this.db
            .prepare(`
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        FROM tenants
        WHERE id = ?
      `)
            .get(tenantId);
        return row ? this.mapTenantRow(row) : undefined;
    }
    createTenant(data) {
        const row = {
            ...data,
            plan: data.plan ?? 'Trial',
            storefrontEnabled: data.storefrontEnabled ?? false,
            manualBookingEnabled: data.manualBookingEnabled ?? true,
        };
        this.db
            .prepare(`
        INSERT INTO tenants (
          id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .run(row.id, row.name, row.slug, row.status, row.plan, row.storefrontEnabled ? 1 : 0, row.manualBookingEnabled ? 1 : 0, row.modules.citas ? 1 : 0, row.modules.ventas ? 1 : 0, row.modules.inventario ? 1 : 0);
        return row;
    }
    updateTenant(tenantId, patch) {
        const current = this.findTenantById(tenantId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            name: patch.name ?? current.name,
            slug: patch.slug ?? current.slug,
            status: patch.status ?? current.status,
            plan: patch.plan ?? current.plan,
            storefrontEnabled: patch.storefrontEnabled !== undefined
                ? patch.storefrontEnabled
                : current.storefrontEnabled,
            manualBookingEnabled: patch.manualBookingEnabled !== undefined
                ? patch.manualBookingEnabled
                : current.manualBookingEnabled,
            modules: {
                ...current.modules,
                ...(patch.modules ?? {}),
            },
        };
        this.db
            .prepare(`
        UPDATE tenants
        SET name = ?, slug = ?, status = ?, plan = ?, storefront_enabled = ?, manual_booking_enabled = ?,
            citas_enabled = ?, ventas_enabled = ?, inventario_enabled = ?
        WHERE id = ?
      `)
            .run(next.name, next.slug, next.status, next.plan, next.storefrontEnabled ? 1 : 0, next.manualBookingEnabled ? 1 : 0, next.modules.citas ? 1 : 0, next.modules.ventas ? 1 : 0, next.modules.inventario ? 1 : 0, tenantId);
        return next;
    }
    deleteTenant(tenantId) {
        const existing = this.findTenantById(tenantId);
        if (!existing) {
            return false;
        }
        this.db.prepare(`DELETE FROM tenants WHERE id = ?`).run(tenantId);
        return true;
    }
    listAppointmentsByTenantId(tenantId) {
        const rows = this.db
            .prepare(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE tenant_id = ?
        ORDER BY when_at ASC
      `)
            .all(tenantId);
        return rows.map((row) => this.mapAppointmentRow(row));
    }
    createAppointment(data) {
        const id = `appt_${Date.now()}`;
        const status = data.status ?? 'pendiente';
        const attendance = data.attendance ?? 'PENDIENTE';
        this.db
            .prepare(`
        INSERT INTO appointments (id, tenant_id, customer, service, when_at, status, attendance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
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
    findAppointmentById(appointmentId) {
        const row = this.db
            .prepare(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE id = ?
      `)
            .get(appointmentId);
        return row ? this.mapAppointmentRow(row) : undefined;
    }
    updateAppointmentStatus(appointmentId, tenantId, status) {
        const current = this.findAppointmentById(appointmentId);
        if (!current || current.tenantId !== tenantId) {
            return undefined;
        }
        this.db
            .prepare(`
        UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?
      `)
            .run(status, appointmentId, tenantId);
        return { ...current, status };
    }
    updateAppointmentAttendance(appointmentId, tenantId, attendance) {
        const current = this.findAppointmentById(appointmentId);
        if (!current || current.tenantId !== tenantId) {
            return undefined;
        }
        const status = attendance === 'ASISTIO'
            ? 'confirmada'
            : attendance === 'NO_ASISTIO'
                ? 'cancelada'
                : 'pendiente';
        this.db
            .prepare(`
        UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?
      `)
            .run(attendance, status, appointmentId, tenantId);
        return { ...current, attendance, status };
    }
    confirmPublicAppointmentAttendance(slug, appointmentId, customerName) {
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
        const norm = (s) => s
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
        if (norm(appt.customer) !== norm(customerName)) {
            return undefined;
        }
        this.db
            .prepare(`
        UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?
      `)
            .run('ASISTIO', 'confirmada', appointmentId, tenant.id);
        return { ...appt, attendance: 'ASISTIO', status: 'confirmada' };
    }
    listStoreVisitsByTenantId(tenantId) {
        const rows = this.db
            .prepare(`
        SELECT id, tenant_id, customer, detail, created_at
        FROM store_visit_logs
        WHERE tenant_id = ?
        ORDER BY datetime(created_at) DESC
      `)
            .all(tenantId);
        return rows.map((row) => this.mapStoreVisitRow(row));
    }
    createStoreVisitLog(data) {
        const id = `visit_${Date.now()}`;
        const createdAt = new Date().toISOString();
        this.db
            .prepare(`
        INSERT INTO store_visit_logs (id, tenant_id, customer, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
            .run(id, data.tenantId, data.customer, data.detail, createdAt);
        return {
            id,
            tenantId: data.tenantId,
            customer: data.customer,
            detail: data.detail,
            createdAt,
        };
    }
    ensureSchemaMigrations() {
        const cols = this.db
            .prepare(`PRAGMA table_info(appointments)`)
            .all();
        if (!cols.some((c) => c.name === 'attendance')) {
            this.db.exec(`ALTER TABLE appointments ADD COLUMN attendance TEXT NOT NULL DEFAULT 'PENDIENTE'`);
        }
        const tcols = this.db
            .prepare(`PRAGMA table_info(tenants)`)
            .all();
        if (!tcols.some((c) => c.name === 'plan')) {
            this.db.exec(`ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'Trial'`);
        }
        if (!tcols.some((c) => c.name === 'storefront_enabled')) {
            this.db.exec(`ALTER TABLE tenants ADD COLUMN storefront_enabled INTEGER NOT NULL DEFAULT 0`);
        }
        if (!tcols.some((c) => c.name === 'manual_booking_enabled')) {
            this.db.exec(`ALTER TABLE tenants ADD COLUMN manual_booking_enabled INTEGER NOT NULL DEFAULT 1`);
        }
    }
    createSchema() {
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
    `);
    }
    seedIfEmpty() {
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
            role: auth_types_1.UserRole.SUPER_ADMIN,
            tenantId: null,
            systems: [auth_types_1.AppSystem.SUPER_ADMIN, auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'ACTIVE',
        });
        this.createUser({
            id: 'usr_admin_spa',
            email: 'admin-spa@azenda.dev',
            password: 'azenda123',
            role: auth_types_1.UserRole.ADMIN,
            tenantId: 'tenant_spa',
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'ACTIVE',
        });
        this.createUser({
            id: 'usr_admin_clinica',
            email: 'admin-clinica@azenda.dev',
            password: 'azenda123',
            role: auth_types_1.UserRole.ADMIN,
            tenantId: 'tenant_clinica',
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'PAUSED',
        });
        this.createUser({
            id: 'usr_employee_1',
            email: 'empleado@azenda.dev',
            password: 'azenda123',
            role: auth_types_1.UserRole.EMPLEADO,
            tenantId: 'tenant_barberia',
            systems: [auth_types_1.AppSystem.TENANT],
            status: 'ACTIVE',
        });
    }
    mapUserRow(row) {
        return {
            id: String(row.id),
            email: String(row.email),
            password: String(row.password),
            role: row.role,
            tenantId: row.tenant_id ? String(row.tenant_id) : null,
            systems: JSON.parse(String(row.systems)),
            status: row.status,
        };
    }
    mapTenantRow(row) {
        const planRaw = row.plan;
        const plan = typeof planRaw === 'string' && planRaw.length ? planRaw : 'Trial';
        return {
            id: String(row.id),
            name: String(row.name),
            slug: String(row.slug),
            status: row.status,
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
    mapAppointmentRow(row) {
        const attendanceRaw = row.attendance;
        const attendance = attendanceRaw === 'ASISTIO' ||
            attendanceRaw === 'NO_ASISTIO' ||
            attendanceRaw === 'PENDIENTE'
            ? attendanceRaw
            : 'PENDIENTE';
        return {
            id: String(row.id),
            tenantId: String(row.tenant_id),
            customer: String(row.customer),
            service: String(row.service),
            when: String(row.when_at),
            status: row.status,
            attendance,
        };
    }
    mapStoreVisitRow(row) {
        return {
            id: String(row.id),
            tenantId: String(row.tenant_id),
            customer: String(row.customer),
            detail: String(row.detail),
            createdAt: String(row.created_at),
        };
    }
};
exports.SqlDbService = SqlDbService;
exports.SqlDbService = SqlDbService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SqlDbService);
//# sourceMappingURL=sql-db.service.js.map