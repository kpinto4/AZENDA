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
var DemoSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoSeedService = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const password_service_1 = require("../auth/password.service");
const demo_tenant_snapshot_1 = require("../../scripts/demo-tenant.snapshot");
const pg_client_service_1 = require("../infrastructure/sql-db/pg-client.service");
let DemoSeedService = DemoSeedService_1 = class DemoSeedService {
    constructor(pg, passwordService) {
        this.pg = pg;
        this.passwordService = passwordService;
        this.logger = new common_1.Logger(DemoSeedService_1.name);
    }
    async ensureDemoTenantSeed() {
        await this.ensureDemoTenantRow();
        await this.ensureDemoUsers();
        await this.ensureCoreCatalog();
        const apptCount = await this.countRows('appointments', demo_tenant_snapshot_1.DEMO_TENANT_ID);
        if (apptCount === 0) {
            await this.insertVolatileSample();
        }
    }
    async insertVolatileSample(now = new Date()) {
        for (const appt of demo_tenant_snapshot_1.DEMO_VOLATILE_APPOINTMENTS) {
            const when = (0, demo_tenant_snapshot_1.formatAppointmentWhen)(appt.offsetMinutes, now);
            const service = (0, demo_tenant_snapshot_1.appendEmployeeToServiceLabel)(appt.serviceName, appt.employeeId);
            await this.pg.exec(`
          INSERT INTO appointments (
            id, tenant_id, customer, service, when_at, status, attendance,
            customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at, duration_minutes
          )
          VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE', NULL, false, NULL, 30)
          ON CONFLICT (id) DO NOTHING
        `, [appt.id, demo_tenant_snapshot_1.DEMO_TENANT_ID, appt.customer, service, when, appt.status]);
        }
        for (const sale of demo_tenant_snapshot_1.DEMO_VOLATILE_SALES) {
            const saleDate = (0, demo_tenant_snapshot_1.formatSaleDate)(sale.daysAgo, now);
            const createdAt = new Date(now.getTime() - sale.daysAgo * 86_400_000).toISOString();
            await this.pg.exec(`
          INSERT INTO tenant_sales (id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at)
          VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)
          ON CONFLICT (id) DO NOTHING
        `, [sale.id, demo_tenant_snapshot_1.DEMO_TENANT_ID, saleDate, sale.total, sale.method, createdAt]);
        }
    }
    async restoreCoreCatalogFromSnapshot() {
        for (const svc of demo_tenant_snapshot_1.DEMO_CORE_SERVICES) {
            await this.pg.exec(`
          UPDATE tenant_services
          SET name = ?, description = ?, price = ?, duration_minutes = ?, catalog_order = ?
          WHERE id = ? AND tenant_id = ?
        `, [
                svc.name,
                svc.description,
                svc.price,
                svc.durationMinutes,
                svc.catalogOrder,
                svc.id,
                demo_tenant_snapshot_1.DEMO_TENANT_ID,
            ]);
        }
        for (const prd of demo_tenant_snapshot_1.DEMO_CORE_PRODUCTS) {
            await this.pg.exec(`
          UPDATE tenant_products
          SET name = ?, description = ?, price = ?, sku = ?, stock = ?, catalog_order = ?
          WHERE id = ? AND tenant_id = ?
        `, [
                prd.name,
                prd.description,
                prd.price,
                prd.sku,
                prd.stock,
                prd.catalogOrder,
                prd.id,
                demo_tenant_snapshot_1.DEMO_TENANT_ID,
            ]);
        }
    }
    async ensureDemoTenantRow() {
        const exists = await this.pg.queryOne(`SELECT id FROM tenants WHERE id = ?`, [demo_tenant_snapshot_1.DEMO_TENANT_ID]);
        if (!exists) {
            const now = new Date().toISOString();
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            await this.pg.exec(`
          INSERT INTO tenants (
            id, name, slug, status, plan, storefront_enabled, manual_booking_enabled,
            citas_enabled, ventas_enabled, inventario_enabled,
            billing_cycle, plan_price_monthly, plan_price_yearly,
            subscription_started_at, current_period_start, current_period_end, next_renewal_at,
            is_demo_tenant
          )
          VALUES (?, ?, ?, 'ACTIVE', 'Negocio', true, true, true, true, true,
                  'MONTHLY', 0, 0, ?, ?, ?, ?, true)
        `, [
                demo_tenant_snapshot_1.DEMO_TENANT_ID,
                demo_tenant_snapshot_1.DEMO_TENANT_NAME,
                demo_tenant_snapshot_1.DEMO_TENANT_SLUG,
                now,
                now,
                periodEnd.toISOString(),
                periodEnd.toISOString(),
            ]);
            await this.pg.exec(`
          INSERT INTO tenant_branding (tenant_id, display_name, logo_url)
          VALUES (?, ?, NULL)
          ON CONFLICT (tenant_id) DO NOTHING
        `, [demo_tenant_snapshot_1.DEMO_TENANT_ID, demo_tenant_snapshot_1.DEMO_TENANT_NAME]);
            this.logger.log(`Tenant demo creado: ${demo_tenant_snapshot_1.DEMO_TENANT_ID}`);
            return;
        }
        await this.pg.exec(`UPDATE tenants SET is_demo_tenant = true, plan = 'Negocio',
        citas_enabled = true, ventas_enabled = true, inventario_enabled = true,
        storefront_enabled = true, manual_booking_enabled = true, status = 'ACTIVE'
       WHERE id = ?`, [demo_tenant_snapshot_1.DEMO_TENANT_ID]);
    }
    async ensureDemoUsers() {
        const hash = await this.passwordService.hash(demo_tenant_snapshot_1.DEMO_SEED_PASSWORD);
        await this.upsertUser({
            id: demo_tenant_snapshot_1.DEMO_ADMIN_USER_ID,
            email: demo_tenant_snapshot_1.DEMO_ADMIN_EMAIL,
            password: hash,
            role: auth_types_1.UserRole.ADMIN,
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
        });
        await this.upsertUser({
            id: demo_tenant_snapshot_1.DEMO_EMPLOYEE_USER_ID,
            email: demo_tenant_snapshot_1.DEMO_EMPLOYEE_EMAIL,
            password: hash,
            role: auth_types_1.UserRole.EMPLEADO,
            systems: [auth_types_1.AppSystem.TENANT],
        });
    }
    async upsertUser(row) {
        const systemsJson = JSON.stringify(row.systems);
        const exists = await this.pg.queryOne(`SELECT id FROM users WHERE id = ?`, [
            row.id,
        ]);
        if (!exists) {
            await this.pg.exec(`
          INSERT INTO users (id, email, password, role, tenant_id, systems, status)
          VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        `, [
                row.id,
                row.email,
                row.password,
                row.role,
                demo_tenant_snapshot_1.DEMO_TENANT_ID,
                systemsJson,
            ]);
            return;
        }
        await this.pg.exec(`UPDATE users SET email = ?, role = ?, tenant_id = ?, systems = ?, status = 'ACTIVE' WHERE id = ?`, [row.email, row.role, demo_tenant_snapshot_1.DEMO_TENANT_ID, systemsJson, row.id]);
    }
    async ensureCoreCatalog() {
        for (const svc of demo_tenant_snapshot_1.DEMO_CORE_SERVICES) {
            await this.pg.exec(`
          INSERT INTO tenant_services (
            id, tenant_id, name, description, price, promo_price, promo_enabled,
            promo_schedule_type, promo_days_json, promo_start_date, promo_end_date, promo_label,
            duration_minutes, catalog_order, is_demo_core
          )
          VALUES (?, ?, ?, ?, ?, NULL, false, NULL, NULL, NULL, NULL, NULL, ?, ?, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            duration_minutes = EXCLUDED.duration_minutes,
            catalog_order = EXCLUDED.catalog_order,
            is_demo_core = true
        `, [
                svc.id,
                demo_tenant_snapshot_1.DEMO_TENANT_ID,
                svc.name,
                svc.description,
                svc.price,
                svc.durationMinutes,
                svc.catalogOrder,
            ]);
        }
        for (const prd of demo_tenant_snapshot_1.DEMO_CORE_PRODUCTS) {
            await this.pg.exec(`
          INSERT INTO tenant_products (
            id, tenant_id, name, description, price, promo_price, promo_enabled,
            promo_schedule_type, promo_days_json, promo_start_date, promo_end_date, promo_label,
            sku, stock, catalog_order, image_url, is_demo_core
          )
          VALUES (?, ?, ?, ?, ?, NULL, false, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, NULL, true)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            sku = EXCLUDED.sku,
            stock = EXCLUDED.stock,
            catalog_order = EXCLUDED.catalog_order,
            is_demo_core = true
        `, [
                prd.id,
                demo_tenant_snapshot_1.DEMO_TENANT_ID,
                prd.name,
                prd.description,
                prd.price,
                prd.sku,
                prd.stock,
                prd.catalogOrder,
            ]);
        }
    }
    async countRows(table, tenantId) {
        const row = await this.pg.queryOne(`SELECT COUNT(*) AS cnt FROM ${table} WHERE tenant_id = ?`, [tenantId]);
        return Number(row?.cnt ?? 0);
    }
};
exports.DemoSeedService = DemoSeedService;
exports.DemoSeedService = DemoSeedService = DemoSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService,
        password_service_1.PasswordService])
], DemoSeedService);
//# sourceMappingURL=demo-seed.service.js.map