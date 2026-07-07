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
var SqlDbService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDbService = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../../auth/auth.types");
const plan_catalog_site_config_1 = require("./plan-catalog-site-config");
const appointment_repository_1 = require("./repositories/appointment.repository");
const platform_site_config_repository_1 = require("./repositories/platform-site-config.repository");
const tenant_branding_repository_1 = require("./repositories/tenant-branding.repository");
const pg_client_service_1 = require("./pg-client.service");
const tenant_catalog_repository_1 = require("./repositories/tenant-catalog.repository");
const tenant_retail_repository_1 = require("./repositories/tenant-retail.repository");
const tenant_repository_1 = require("./repositories/tenant.repository");
const user_repository_1 = require("./repositories/user.repository");
const tenant_billing_service_1 = require("./tenant-billing.service");
const env_util_1 = require("../../common/env.util");
const seed_credentials_1 = require("./seed-credentials");
let SqlDbService = SqlDbService_1 = class SqlDbService {
    constructor(pg, users, tenants, appointments, catalog, retail, tenantBranding, platformSite, tenantBilling) {
        this.pg = pg;
        this.users = users;
        this.tenants = tenants;
        this.appointments = appointments;
        this.catalog = catalog;
        this.retail = retail;
        this.tenantBranding = tenantBranding;
        this.platformSite = platformSite;
        this.tenantBilling = tenantBilling;
        this.logger = new common_1.Logger(SqlDbService_1.name);
    }
    async onModuleInit() {
        const runOnStart = ['1', 'true', 'yes', 'on'].includes(String(process.env.DB_BOOTSTRAP_ON_START ?? '')
            .trim()
            .toLowerCase());
        if (runOnStart) {
            await this.runBootstrapInternal('arranque (DB_BOOTSTRAP_ON_START)');
            return;
        }
        await this.pingOrThrow();
        await this.createSchema();
        await this.ensureSchemaMigrations();
        await this.users.migrateLegacyPlaintextPasswords();
        await this.syncSuperAdminSeedPassword();
        if ((0, env_util_1.isDemoFeaturesEnabled)()) {
            await this.syncKnownSeedUsers();
        }
        this.logger.log('PostgreSQL: tablas y migraciones ligeras verificadas en el arranque. ' +
            'Semilla (usuarios demo): npm run db:bootstrap en la raiz si la base esta vacia. ' +
            'DB_BOOTSTRAP_ON_START=1 fuerza bootstrap en cada arranque.');
    }
    async runBootstrap() {
        await this.runBootstrapInternal('db:bootstrap / runBootstrap()');
    }
    async pingOrThrow() {
        try {
            await this.pg.queryRows('SELECT 1');
        }
        catch (err) {
            const code = err.code;
            const isConn = code === 'ECONNREFUSED' ||
                code === 'ENOTFOUND' ||
                code === 'ETIMEDOUT' ||
                code === 'EAI_AGAIN';
            if (isConn) {
                this.logger.error(`No hay conexion a PostgreSQL via DATABASE_URL. ` +
                    `Verifica credenciales/red de Neon y vuelve a intentar. ` +
                    `Semilla inicial: npm run db:bootstrap.`);
            }
            throw err;
        }
    }
    async runBootstrapInternal(context) {
        try {
            await this.createSchema();
            await this.ensureSchemaMigrations();
            await this.users.migrateLegacyPlaintextPasswords();
            await this.syncSuperAdminSeedPassword();
            if ((0, env_util_1.isDemoFeaturesEnabled)()) {
                await this.syncKnownSeedUsers();
            }
            await this.seedIfEmpty();
            this.logger.log(`PostgreSQL listo (${context}): esquema y semilla verificados`);
        }
        catch (err) {
            const code = err.code;
            const isConn = code === 'ECONNREFUSED' ||
                code === 'ENOTFOUND' ||
                code === 'ETIMEDOUT' ||
                code === 'EAI_AGAIN';
            if (isConn) {
                this.logger.error('No hay conexion a PostgreSQL via DATABASE_URL. Verifica Neon y ejecuta npm run db:bootstrap.');
            }
            throw err;
        }
    }
    async findUserByEmailNormalized(normalizedEmail) {
        return this.users.findByEmailNormalized(normalizedEmail);
    }
    async findUserById(userId) {
        return this.users.findById(userId);
    }
    async listUsers() {
        return this.users.listAll();
    }
    async listUsersByTenantId(tenantId) {
        return this.users.listByTenantId(tenantId);
    }
    async createUser(data) {
        return this.users.create(data);
    }
    async updateUser(userId, patch) {
        return this.users.update(userId, patch);
    }
    async deleteUser(userId) {
        return this.users.delete(userId);
    }
    async deleteUserByTenant(userId, tenantId) {
        return this.users.deleteByTenant(userId, tenantId);
    }
    async listTenants() {
        return this.tenants.listTenants();
    }
    async findTenantBySlug(slug) {
        return this.tenants.findBySlug(slug);
    }
    async findTenantById(tenantId) {
        return this.tenants.findById(tenantId);
    }
    async isDemoTenant(tenantId) {
        const row = await this.pg.queryOne(`SELECT is_demo_tenant FROM tenants WHERE id = ?`, [tenantId]);
        return Boolean(row?.is_demo_tenant);
    }
    async createTenant(data) {
        return this.tenants.createTenant(data);
    }
    async updateTenant(tenantId, patch) {
        return this.tenants.updateTenant(tenantId, patch);
    }
    async deleteTenant(tenantId) {
        return this.tenants.deleteTenant(tenantId);
    }
    async getTenantBillingSnapshot(tenantId) {
        return this.tenantBilling.getTenantBillingSnapshot(tenantId);
    }
    async getUpgradeQuote(params) {
        return this.tenantBilling.getUpgradeQuote(params);
    }
    async listAppointmentsByTenantId(tenantId) {
        return this.appointments.listByTenantId(tenantId);
    }
    async createAppointment(data) {
        return this.appointments.create(data);
    }
    async markAppointmentReminderSentForTenant(appointmentId, tenantId) {
        return this.appointments.markReminderSentForTenant(appointmentId, tenantId);
    }
    async findAppointmentByTenantAndWhen(tenantId, when) {
        return this.appointments.findByTenantAndWhen(tenantId, when);
    }
    async findAppointmentById(appointmentId) {
        return this.appointments.findById(appointmentId);
    }
    async updateAppointmentWhenAndService(tenantId, appointmentId, when, service) {
        return this.appointments.updateWhenAndService(tenantId, appointmentId, when, service);
    }
    async updateAppointmentStatus(appointmentId, tenantId, status) {
        return this.appointments.updateStatus(appointmentId, tenantId, status);
    }
    async updateAppointmentAttendance(appointmentId, tenantId, attendance) {
        return this.appointments.updateAttendance(appointmentId, tenantId, attendance);
    }
    async confirmPublicAppointmentAttendance(slug, appointmentId, customerName) {
        return this.appointments.confirmPublicAttendance(slug, appointmentId, customerName);
    }
    async lookupPublicAppointmentsForClient(slug, customerNameRaw, appointmentIdRaw, customerPhoneRaw) {
        return this.appointments.lookupPublicForClient(slug, customerNameRaw, appointmentIdRaw, customerPhoneRaw);
    }
    async listStoreVisitsByTenantId(tenantId) {
        return this.retail.listStoreVisitsByTenantId(tenantId);
    }
    async createStoreVisitLog(data) {
        return this.retail.createStoreVisitLog(data);
    }
    async listTenantSalesByTenantId(tenantId) {
        return this.retail.listTenantSalesByTenantId(tenantId);
    }
    async insertTenantSale(data) {
        return this.retail.insertTenantSale(data);
    }
    async listStockMovementsByTenantId(tenantId, limit) {
        return this.retail.listStockMovementsByTenantId(tenantId, limit);
    }
    async insertStockMovement(data) {
        return this.retail.insertStockMovement(data);
    }
    async getTenantBranding(tenantId) {
        return this.tenantBranding.get(tenantId);
    }
    async updateTenantBranding(tenantId, patch) {
        return this.tenantBranding.update(tenantId, patch);
    }
    async listProductsByTenantId(tenantId) {
        return this.catalog.listProductsByTenantId(tenantId);
    }
    async createTenantProduct(tenantId, data) {
        return this.catalog.createTenantProduct(tenantId, data);
    }
    async updateTenantProduct(tenantId, productId, patch) {
        return this.catalog.updateTenantProduct(tenantId, productId, patch);
    }
    async deleteTenantProduct(tenantId, productId) {
        return this.catalog.deleteTenantProduct(tenantId, productId);
    }
    async moveTenantProduct(tenantId, productId, direction) {
        return this.catalog.moveTenantProduct(tenantId, productId, direction);
    }
    async listServicesByTenantId(tenantId) {
        return this.catalog.listServicesByTenantId(tenantId);
    }
    async createTenantService(tenantId, data) {
        return this.catalog.createTenantService(tenantId, data);
    }
    async updateTenantService(tenantId, serviceId, patch) {
        return this.catalog.updateTenantService(tenantId, serviceId, patch);
    }
    async deleteTenantService(tenantId, serviceId) {
        return this.catalog.deleteTenantService(tenantId, serviceId);
    }
    async moveTenantService(tenantId, serviceId, direction) {
        return this.catalog.moveTenantService(tenantId, serviceId, direction);
    }
    async columnExists(table, column) {
        const row = await this.pg.queryOne(`
        SELECT 1 AS ok
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND lower(table_name) = lower(?)
          AND lower(column_name) = lower(?)
      `, [table, column]);
        return Boolean(row);
    }
    async ensureSchemaMigrations() {
        if (!(await this.columnExists('appointments', 'attendance'))) {
            await this.pg.execScript(`ALTER TABLE appointments ADD COLUMN attendance TEXT NOT NULL DEFAULT 'PENDIENTE'`);
        }
        if (!(await this.columnExists('tenants', 'plan'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'Trial'`);
        }
        if (!(await this.columnExists('tenants', 'storefront_enabled'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN storefront_enabled BOOLEAN NOT NULL DEFAULT false`);
        }
        if (!(await this.columnExists('tenants', 'manual_booking_enabled'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN manual_booking_enabled BOOLEAN NOT NULL DEFAULT true`);
        }
        if (!(await this.columnExists('tenants', 'billing_cycle'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY'`);
        }
        if (!(await this.columnExists('tenants', 'plan_price_monthly'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN plan_price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0`);
        }
        if (!(await this.columnExists('tenants', 'plan_price_yearly'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN plan_price_yearly NUMERIC(12,2) NOT NULL DEFAULT 0`);
        }
        if (!(await this.columnExists('tenants', 'subscription_started_at'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN subscription_started_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z'`);
        }
        if (!(await this.columnExists('tenants', 'current_period_start'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN current_period_start TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z'`);
        }
        if (!(await this.columnExists('tenants', 'current_period_end'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN current_period_end TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z'`);
        }
        if (!(await this.columnExists('tenants', 'next_renewal_at'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN next_renewal_at TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z'`);
        }
        if (!(await this.columnExists('tenant_branding', 'public_address'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN public_address TEXT NULL`);
        }
        if (!(await this.columnExists('tenant_branding', 'public_maps_url'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN public_maps_url TEXT NULL`);
        }
        if (!(await this.columnExists('tenant_branding', 'cancellation_policy'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN cancellation_policy TEXT NULL`);
        }
        if (!(await this.columnExists('tenant_branding', 'reminder_notice'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN reminder_notice TEXT NULL`);
        }
        if (!(await this.columnExists('appointments', 'customer_phone_e164'))) {
            await this.pg.execScript(`ALTER TABLE appointments ADD COLUMN customer_phone_e164 TEXT NULL`);
        }
        if (!(await this.columnExists('appointments', 'wa_reminder_consent'))) {
            await this.pg.execScript(`ALTER TABLE appointments ADD COLUMN wa_reminder_consent BOOLEAN NOT NULL DEFAULT false`);
        }
        if (!(await this.columnExists('appointments', 'wa_reminder_sent_at'))) {
            await this.pg.execScript(`ALTER TABLE appointments ADD COLUMN wa_reminder_sent_at TEXT NULL`);
        }
        if (!(await this.columnExists('appointments', 'duration_minutes'))) {
            await this.pg.execScript(`ALTER TABLE appointments ADD COLUMN duration_minutes INT NULL`);
        }
        if (!(await this.columnExists('tenants', 'is_demo_tenant'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN is_demo_tenant BOOLEAN NOT NULL DEFAULT false`);
        }
        if (!(await this.columnExists('tenants', 'subscription_status'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active'`);
        }
        if (!(await this.columnExists('tenants', 'billing_customized'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN billing_customized BOOLEAN NOT NULL DEFAULT false`);
        }
        if (!(await this.columnExists('tenants', 'billing_notes'))) {
            await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN billing_notes TEXT NOT NULL DEFAULT ''`);
        }
        for (const table of ['tenant_services', 'tenant_products']) {
            if (!(await this.columnExists(table, 'is_demo_core'))) {
                await this.pg.execScript(`ALTER TABLE ${table} ADD COLUMN is_demo_core BOOLEAN NOT NULL DEFAULT false`);
            }
        }
        const tenantRows = await this.pg.queryRows(`SELECT id, name FROM tenants`);
        for (const t of tenantRows) {
            await this.tenants.ensureDefaultBranding(String(t.id), String(t.name));
        }
        await this.tenants.ensurePlanCatalogTable();
        await this.platformSite.ensureTableAndDefaultRow();
        const catalog = await this.tenants.listPlanCatalog();
        const pricePatch = (0, plan_catalog_site_config_1.planCatalogPricePatch)(catalog);
        if (Object.keys(pricePatch).length > 0) {
            await this.platformSite.patch(pricePatch);
        }
        await this.retail.ensureSalesTable();
        await this.pg.exec(`UPDATE tenants SET ventas_enabled = false, inventario_enabled = false WHERE plan = ?`, ['Básico']);
        await this.tenants.syncTenantPlanPricesFromCatalog();
        await this.normalizeTenantBillingPeriods();
    }
    async createSchema() {
        await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'Trial',
        storefront_enabled BOOLEAN NOT NULL DEFAULT false,
        manual_booking_enabled BOOLEAN NOT NULL DEFAULT true,
        billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
        plan_price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
        plan_price_yearly NUMERIC(12,2) NOT NULL DEFAULT 0,
        subscription_started_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z',
        current_period_start TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z',
        current_period_end TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z',
        next_renewal_at TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z',
        citas_enabled BOOLEAN NOT NULL DEFAULT true,
        ventas_enabled BOOLEAN NOT NULL DEFAULT true,
        inventario_enabled BOOLEAN NOT NULL DEFAULT false
      )
    `);
        await this.pg.execScript(`
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
        await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer TEXT NOT NULL,
        service TEXT NOT NULL,
        when_at TEXT NOT NULL,
        status TEXT NOT NULL,
        attendance TEXT NOT NULL DEFAULT 'PENDIENTE',
        customer_phone_e164 TEXT NULL,
        wa_reminder_consent BOOLEAN NOT NULL DEFAULT false,
        wa_reminder_sent_at TEXT NULL,
        duration_minutes INT NULL,
        CONSTRAINT fk_appt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
        await this.pg.ensureIndex(`CREATE INDEX idx_appointments_tenant_when ON appointments (tenant_id, when_at)`);
        await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS store_visit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        customer TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL,
        CONSTRAINT fk_visit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
        await this.pg.ensureIndex(`CREATE INDEX idx_store_visits_tenant_created ON store_visit_logs (tenant_id, created_at)`);
        await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_branding (
        tenant_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        logo_url TEXT NULL,
        public_address TEXT NULL,
        public_maps_url TEXT NULL,
        cancellation_policy TEXT NULL,
        reminder_notice TEXT NULL,
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
        whatsapp_phone_e164 TEXT NULL,
        whatsapp_default_message TEXT NULL,
        public_booking_hours_json TEXT NULL,
        CONSTRAINT fk_branding_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
        if (!(await this.columnExists('tenant_branding', 'whatsapp_phone_e164'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN whatsapp_phone_e164 TEXT NULL`);
        }
        if (!(await this.columnExists('tenant_branding', 'whatsapp_default_message'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN whatsapp_default_message TEXT NULL`);
        }
        if (!(await this.columnExists('tenant_branding', 'public_booking_hours_json'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN public_booking_hours_json TEXT NULL`);
        }
        if (!(await this.columnExists('tenant_branding', 'reviews_url'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN reviews_url TEXT NULL`);
        }
        if (!(await this.columnExists('tenant_branding', 'pos_payment_methods_json'))) {
            await this.pg.execScript(`ALTER TABLE tenant_branding ADD COLUMN pos_payment_methods_json TEXT NULL`);
        }
        await this.pg.execScript(`
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
        await this.pg.ensureIndex(`CREATE INDEX idx_tenant_products_tenant_order ON tenant_products (tenant_id, catalog_order)`);
        await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_services (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        promo_price NUMERIC(12,2) NULL,
        promo_label TEXT NULL,
        duration_minutes INT NOT NULL DEFAULT 30,
        catalog_order INT NOT NULL DEFAULT 0,
        CONSTRAINT fk_service_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
        await this.pg.ensureIndex(`CREATE INDEX idx_tenant_services_tenant_order ON tenant_services (tenant_id, catalog_order)`);
        if (!(await this.columnExists('tenant_services', 'duration_minutes'))) {
            await this.pg.execScript(`ALTER TABLE tenant_services ADD COLUMN duration_minutes INT NOT NULL DEFAULT 30`);
        }
        await this.ensureCatalogPromoScheduleColumns();
        await this.retail.ensureSalesTable();
        await this.platformSite.ensureTableAndDefaultRow();
    }
    async ensureCatalogPromoScheduleColumns() {
        const promoColumns = [
            { name: 'promo_enabled', ddl: 'BOOLEAN NOT NULL DEFAULT false' },
            { name: 'promo_schedule_type', ddl: 'TEXT NULL' },
            { name: 'promo_days_json', ddl: 'TEXT NULL' },
            { name: 'promo_start_date', ddl: 'TEXT NULL' },
            { name: 'promo_end_date', ddl: 'TEXT NULL' },
        ];
        for (const table of ['tenant_services', 'tenant_products']) {
            for (const col of promoColumns) {
                if (!(await this.columnExists(table, col.name))) {
                    await this.pg.execScript(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.ddl}`);
                }
            }
            if (table === 'tenant_products' &&
                !(await this.columnExists(table, 'promo_label'))) {
                await this.pg.execScript(`ALTER TABLE tenant_products ADD COLUMN promo_label TEXT NULL`);
            }
        }
        const legacyServices = await this.pg.queryRows(`SELECT id, promo_price, promo_label FROM tenant_services WHERE promo_price IS NOT NULL AND promo_enabled = false`);
        for (const row of legacyServices) {
            const promoLabel = row.promo_label == null ? null : String(row.promo_label).trim();
            const labelNorm = (promoLabel ?? '').toLowerCase();
            const isWeekdays = !!promoLabel &&
                /\b(lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab|domingo|dom)\s+a\s+/i.test(labelNorm);
            let promoDaysJson = null;
            if (isWeekdays && /lunes.*jueves/i.test(labelNorm)) {
                promoDaysJson = '[1,2,3,4]';
            }
            else if (isWeekdays && /lunes.*viernes/i.test(labelNorm)) {
                promoDaysJson = '[1,2,3,4,5]';
            }
            else if (isWeekdays) {
                promoDaysJson = '[1,2,3,4,5,6,0]';
            }
            await this.pg.exec(`UPDATE tenant_services SET promo_enabled = ?, promo_schedule_type = ?, promo_days_json = ? WHERE id = ?`, [
                true,
                isWeekdays ? 'weekdays' : 'always',
                promoDaysJson,
                String(row.id),
            ]);
        }
        const legacyProducts = await this.pg.queryRows(`SELECT id, promo_price FROM tenant_products WHERE promo_price IS NOT NULL AND promo_enabled = false`);
        for (const row of legacyProducts) {
            await this.pg.exec(`UPDATE tenant_products SET promo_enabled = ?, promo_schedule_type = ? WHERE id = ?`, [true, 'always', String(row.id)]);
        }
    }
    async normalizeTenantBillingPeriods() {
        const tenants = await this.listTenants();
        const now = new Date();
        for (const tenant of tenants) {
            let start = new Date(tenant.currentPeriodStart);
            let end = new Date(tenant.currentPeriodEnd);
            const invalidRange = Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime()) ||
                end <= start;
            if (invalidRange) {
                start = now;
                end = new Date(this.tenants.computeBillingCycleEnd(start.toISOString(), tenant.billingCycle));
            }
            while (end < now) {
                start = end;
                end = new Date(this.tenants.computeBillingCycleEnd(start.toISOString(), tenant.billingCycle));
            }
            const nextRenewalAt = end.toISOString();
            const changed = tenant.currentPeriodStart !== start.toISOString() ||
                tenant.currentPeriodEnd !== end.toISOString() ||
                tenant.nextRenewalAt !== nextRenewalAt;
            if (!changed) {
                continue;
            }
            await this.pg.exec(`UPDATE tenants SET current_period_start = ?, current_period_end = ?, next_renewal_at = ? WHERE id = ?`, [start.toISOString(), end.toISOString(), nextRenewalAt, tenant.id]);
        }
    }
    async syncSuperAdminSeedPassword() {
        await this.users.syncSeedPasswordIfInvalid(seed_credentials_1.SUPER_ADMIN_SEED_USER_ID, (0, seed_credentials_1.getSuperAdminSeedPassword)());
    }
    async syncKnownSeedUsers() {
        const seedPassword = 'azenda123';
        const demoSeedIds = ['usr_demo_admin', 'usr_demo_employee'];
        const devSeedIds = [
            'usr_admin_spa',
            'usr_admin_clinica',
            'usr_employee_1',
            ...demoSeedIds,
        ];
        for (const userId of devSeedIds) {
            if (!(0, env_util_1.isDemoFeaturesEnabled)() && demoSeedIds.includes(userId)) {
                continue;
            }
            await this.users.syncSeedPasswordIfInvalid(userId, seedPassword);
        }
    }
    async seedIfEmpty() {
        const countRow = await this.pg.queryOne(`SELECT COUNT(*) AS cnt FROM users`);
        const count = Number(countRow?.cnt ?? 0);
        if (count > 0) {
            return;
        }
        if ((0, env_util_1.isDemoFeaturesEnabled)()) {
            await this.ensureSeedTenant({
                id: 'tenant_spa',
                name: 'Spa Relax',
                slug: 'spa-relax',
                status: 'ACTIVE',
                plan: 'Básico',
                billingCycle: 'MONTHLY',
                planPriceMonthly: 29,
                planPriceYearly: 290,
                storefrontEnabled: false,
                modules: { citas: true, ventas: true, inventario: false },
            });
            await this.ensureSeedTenant({
                id: 'tenant_clinica',
                name: 'Clinica Demo',
                slug: 'clinica-demo',
                status: 'PAUSED',
                plan: 'Pro',
                billingCycle: 'MONTHLY',
                planPriceMonthly: 59,
                planPriceYearly: 590,
                storefrontEnabled: false,
                modules: { citas: true, ventas: true, inventario: true },
            });
            await this.ensureSeedTenant({
                id: 'tenant_barberia',
                name: 'Barberia Centro',
                slug: 'barberia-centro',
                status: 'ACTIVE',
                plan: 'Pro',
                billingCycle: 'YEARLY',
                planPriceMonthly: 59,
                planPriceYearly: 590,
                storefrontEnabled: true,
                modules: { citas: true, ventas: true, inventario: true },
            });
        }
        await this.ensureSeedUser({
            id: 'usr_super_1',
            email: 'super@azenda.dev',
            password: (0, seed_credentials_1.getSuperAdminSeedPassword)(),
            role: auth_types_1.UserRole.SUPER_ADMIN,
            tenantId: null,
            systems: [
                auth_types_1.AppSystem.SUPER_ADMIN,
                auth_types_1.AppSystem.TENANT,
                auth_types_1.AppSystem.PUBLIC_BOOKING,
            ],
            status: 'ACTIVE',
        });
        if (!(0, env_util_1.isDemoFeaturesEnabled)()) {
            return;
        }
        await this.ensureSeedUser({
            id: 'usr_admin_spa',
            email: 'admin-spa@azenda.dev',
            password: 'azenda123',
            role: auth_types_1.UserRole.ADMIN,
            tenantId: 'tenant_spa',
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'ACTIVE',
        });
        await this.ensureSeedUser({
            id: 'usr_admin_clinica',
            email: 'admin-clinica@azenda.dev',
            password: 'azenda123',
            role: auth_types_1.UserRole.ADMIN,
            tenantId: 'tenant_clinica',
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'PAUSED',
        });
        await this.ensureSeedUser({
            id: 'usr_employee_1',
            email: 'empleado@azenda.dev',
            password: 'azenda123',
            role: auth_types_1.UserRole.EMPLEADO,
            tenantId: 'tenant_barberia',
            systems: [auth_types_1.AppSystem.TENANT],
            status: 'ACTIVE',
        });
    }
    async ensureSeedTenant(row) {
        const exists = await this.findTenantById(row.id);
        if (exists) {
            return;
        }
        await this.createTenant(row);
    }
    async ensureSeedUser(row) {
        const exists = await this.findUserById(row.id);
        if (!exists) {
            await this.createUser(row);
            return;
        }
        await this.users.syncSeedPasswordIfInvalid(row.id, row.password);
    }
    async getPlanCatalogPrices(planKey) {
        return this.tenants.getPlanCatalogPrices(planKey);
    }
    async listPlanCatalog() {
        return this.tenants.listPlanCatalog();
    }
    async replacePlanCatalog(entries) {
        return this.tenants.replacePlanCatalog(entries);
    }
    async getPlatformSiteConfig() {
        return this.platformSite.get();
    }
    async getPlatformSiteConfigForPublic() {
        const [config, catalog] = await Promise.all([
            this.platformSite.get(),
            this.tenants.listPlanCatalog(),
        ]);
        return (0, plan_catalog_site_config_1.applyPlanCatalogPricesToSiteConfig)(config, catalog);
    }
    async patchPlatformSiteConfig(patch) {
        return this.platformSite.patch(patch);
    }
};
exports.SqlDbService = SqlDbService;
exports.SqlDbService = SqlDbService = SqlDbService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService,
        user_repository_1.UserRepository,
        tenant_repository_1.TenantRepository,
        appointment_repository_1.AppointmentRepository,
        tenant_catalog_repository_1.TenantCatalogRepository,
        tenant_retail_repository_1.TenantRetailRepository,
        tenant_branding_repository_1.TenantBrandingRepository,
        platform_site_config_repository_1.PlatformSiteConfigRepository,
        tenant_billing_service_1.TenantBillingService])
], SqlDbService);
//# sourceMappingURL=sql-db.service.js.map