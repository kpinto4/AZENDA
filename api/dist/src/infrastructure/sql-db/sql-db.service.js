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
const pg_1 = require("pg");
const auth_types_1 = require("../../auth/auth.types");
const sql_db_types_1 = require("./sql-db.types");
const DEFAULT_PLAN_CATALOG_SEED = [
    { planKey: 'Trial', priceMonthly: 0, priceYearly: 0 },
    { planKey: 'Básico', priceMonthly: 29, priceYearly: 290 },
    { planKey: 'Pro', priceMonthly: 59, priceYearly: 590 },
    { planKey: 'Negocio', priceMonthly: 99, priceYearly: 990 },
];
let SqlDbService = SqlDbService_1 = class SqlDbService {
    constructor() {
        this.logger = new common_1.Logger(SqlDbService_1.name);
        this.dialect = 'postgres';
        const connectionString = process.env.DATABASE_URL?.trim();
        if (!connectionString) {
            throw new Error('DATABASE_URL es obligatorio. Este proyecto usa Neon como base principal.');
        }
        const sslMode = (process.env.PGSSLMODE ?? '').trim().toLowerCase();
        const requireSsl = sslMode === 'require' ||
            ['1', 'true', 'yes', 'on'].includes(String(process.env.PGSSL ?? '').trim().toLowerCase()) ||
            (connectionString?.toLowerCase().includes('sslmode=require') ?? false);
        const ssl = requireSsl ? { rejectUnauthorized: false } : undefined;
        this.pool = new pg_1.Pool({
            connectionString,
            ssl,
            max: 10,
        });
        let hostHint = 'remoto';
        try {
            const u = new URL(connectionString);
            if (u.hostname)
                hostHint = u.hostname;
        }
        catch {
        }
        this.logger.log(`Postgres por DATABASE_URL (${hostHint}; p. ej. Neon)`);
    }
    async onModuleInit() {
        const runOnStart = ['1', 'true', 'yes', 'on'].includes(String(process.env.DB_BOOTSTRAP_ON_START ?? '').trim().toLowerCase());
        if (runOnStart) {
            await this.runBootstrapInternal('arranque (DB_BOOTSTRAP_ON_START)');
            return;
        }
        await this.pingOrThrow();
        await this.createSchema();
        await this.ensureSchemaMigrations();
        this.logger.log('PostgreSQL: tablas y migraciones ligeras verificadas en el arranque. ' +
            'Semilla (usuarios demo): npm run db:bootstrap en la raiz si la base esta vacia. ' +
            'DB_BOOTSTRAP_ON_START=1 fuerza bootstrap en cada arranque.');
    }
    async runBootstrap() {
        await this.runBootstrapInternal('db:bootstrap / runBootstrap()');
    }
    async pingOrThrow() {
        try {
            await this.queryRows('SELECT 1');
        }
        catch (err) {
            const code = err.code;
            const isConn = code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN';
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
            await this.seedIfEmpty();
            this.logger.log(`PostgreSQL listo (${context}): esquema y semilla verificados`);
        }
        catch (err) {
            const code = err.code;
            const isConn = code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN';
            if (isConn) {
                this.logger.error('No hay conexion a PostgreSQL via DATABASE_URL. Verifica Neon y ejecuta npm run db:bootstrap.');
            }
            throw err;
        }
    }
    async onModuleDestroy() {
        await this.pool.end();
    }
    toPgSql(sql) {
        let n = 0;
        return sql.replace(/\?/g, () => `$${++n}`);
    }
    async queryRows(sql, params = []) {
        const res = await this.pool.query(this.toPgSql(sql), params);
        return res.rows;
    }
    async queryOne(sql, params = []) {
        const rows = await this.queryRows(sql, params);
        return rows[0];
    }
    async exec(sql, params = []) {
        await this.pool.query(this.toPgSql(sql), params);
    }
    async execScript(sql) {
        await this.pool.query(sql);
    }
    async ensureIndex(createSql) {
        try {
            await this.pool.query(createSql);
        }
        catch (e) {
            const code = e.code;
            if (code === '42P07') {
                return;
            }
            throw e;
        }
    }
    async findUserByCredentials(email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const row = await this.queryOne(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE LOWER(TRIM(email)) = ? AND password = ?
      `, [normalizedEmail, password]);
        return row ? this.mapUserRow(row) : undefined;
    }
    async findUserById(userId) {
        const row = await this.queryOne(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE id = ?
      `, [userId]);
        return row ? this.mapUserRow(row) : undefined;
    }
    async listUsers() {
        const rows = await this.queryRows(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        ORDER BY email ASC
      `);
        return rows.map((row) => this.mapUserRow(row));
    }
    async listUsersByTenantId(tenantId) {
        const rows = await this.queryRows(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE tenant_id = ?
        ORDER BY email ASC
      `, [tenantId]);
        return rows.map((row) => this.mapUserRow(row));
    }
    async createUser(data) {
        await this.exec(`
        INSERT INTO users (id, email, password, role, tenant_id, systems, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
            data.id,
            data.email,
            data.password,
            data.role,
            data.tenantId,
            JSON.stringify(data.systems),
            data.status,
        ]);
        return data;
    }
    async updateUser(userId, patch) {
        const current = await this.findUserById(userId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            ...patch,
            systems: patch.systems ?? current.systems,
        };
        await this.exec(`
        UPDATE users
        SET email = ?, password = ?, role = ?, tenant_id = ?, systems = ?, status = ?
        WHERE id = ?
      `, [
            next.email,
            next.password,
            next.role,
            next.tenantId,
            JSON.stringify(next.systems),
            next.status,
            userId,
        ]);
        return next;
    }
    async deleteUser(userId) {
        const existing = await this.findUserById(userId);
        if (!existing) {
            return false;
        }
        await this.exec(`DELETE FROM users WHERE id = ?`, [userId]);
        return true;
    }
    async deleteUserByTenant(userId, tenantId) {
        const existing = await this.findUserById(userId);
        if (!existing || existing.tenantId !== tenantId) {
            return false;
        }
        await this.exec(`DELETE FROM users WHERE id = ? AND tenant_id = ?`, [userId, tenantId]);
        return true;
    }
    async listTenants() {
        const catalog = await this.fetchPlanCatalogMap();
        const rows = await this.queryRows(`
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
             , billing_cycle, plan_price_monthly, plan_price_yearly, subscription_started_at, current_period_start, current_period_end, next_renewal_at
        FROM tenants
        ORDER BY name ASC
      `);
        return rows.map((row) => this.mergeTenantWithCatalog(this.mapTenantRow(row), catalog));
    }
    async findTenantBySlug(slug) {
        const row = await this.queryOne(`
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
             , billing_cycle, plan_price_monthly, plan_price_yearly, subscription_started_at, current_period_start, current_period_end, next_renewal_at
        FROM tenants
        WHERE slug = ?
      `, [slug]);
        if (!row) {
            return undefined;
        }
        const t = this.mapTenantRow(row);
        return this.mergeTenantWithCatalog(t, await this.fetchPlanCatalogMap());
    }
    async findTenantById(tenantId) {
        const row = await this.queryOne(`
        SELECT id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
             , billing_cycle, plan_price_monthly, plan_price_yearly, subscription_started_at, current_period_start, current_period_end, next_renewal_at
        FROM tenants
        WHERE id = ?
      `, [tenantId]);
        if (!row) {
            return undefined;
        }
        const t = this.mapTenantRow(row);
        return this.mergeTenantWithCatalog(t, await this.fetchPlanCatalogMap());
    }
    async createTenant(data) {
        const now = new Date();
        const defaultCycle = data.billingCycle ?? 'MONTHLY';
        const periodStart = data.currentPeriodStart ?? now.toISOString();
        const periodEnd = data.currentPeriodEnd ??
            this.computeCycleEnd(periodStart, defaultCycle);
        const plan = data.plan ?? 'Trial';
        const catalogPrices = await this.getPlanCatalogPrices(plan);
        const row = {
            ...data,
            plan,
            storefrontEnabled: data.storefrontEnabled ?? false,
            manualBookingEnabled: data.manualBookingEnabled ?? true,
            billingCycle: defaultCycle,
            planPriceMonthly: catalogPrices.monthly,
            planPriceYearly: catalogPrices.yearly,
            subscriptionStartedAt: data.subscriptionStartedAt ?? periodStart,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            nextRenewalAt: data.nextRenewalAt ?? periodEnd,
        };
        await this.exec(`
        INSERT INTO tenants (
          id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled,
          billing_cycle, plan_price_monthly, plan_price_yearly, subscription_started_at, current_period_start, current_period_end, next_renewal_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
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
            row.billingCycle,
            row.planPriceMonthly,
            row.planPriceYearly,
            row.subscriptionStartedAt,
            row.currentPeriodStart,
            row.currentPeriodEnd,
            row.nextRenewalAt,
        ]);
        await this.ensureTenantBranding(row.id, row.name);
        return (await this.findTenantById(row.id)) ?? row;
    }
    async updateTenant(tenantId, patch) {
        const current = await this.findTenantById(tenantId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            name: patch.name ?? current.name,
            slug: patch.slug ?? current.slug,
            status: patch.status ?? current.status,
            plan: patch.plan ?? current.plan,
            storefrontEnabled: patch.storefrontEnabled !== undefined ? patch.storefrontEnabled : current.storefrontEnabled,
            manualBookingEnabled: patch.manualBookingEnabled !== undefined
                ? patch.manualBookingEnabled
                : current.manualBookingEnabled,
            billingCycle: patch.billingCycle ?? current.billingCycle,
            planPriceMonthly: current.planPriceMonthly,
            planPriceYearly: current.planPriceYearly,
            subscriptionStartedAt: patch.subscriptionStartedAt ?? current.subscriptionStartedAt,
            currentPeriodStart: patch.currentPeriodStart ?? current.currentPeriodStart,
            currentPeriodEnd: patch.currentPeriodEnd ?? current.currentPeriodEnd,
            nextRenewalAt: patch.nextRenewalAt ?? current.nextRenewalAt,
            modules: {
                ...current.modules,
                ...(patch.modules ?? {}),
            },
        };
        const catalogPrices = await this.getPlanCatalogPrices(next.plan);
        next.planPriceMonthly = catalogPrices.monthly;
        next.planPriceYearly = catalogPrices.yearly;
        await this.exec(`
        UPDATE tenants
        SET name = ?, slug = ?, status = ?, plan = ?, storefront_enabled = ?, manual_booking_enabled = ?,
            citas_enabled = ?, ventas_enabled = ?, inventario_enabled = ?, billing_cycle = ?,
            plan_price_monthly = ?, plan_price_yearly = ?, subscription_started_at = ?,
            current_period_start = ?, current_period_end = ?, next_renewal_at = ?
        WHERE id = ?
      `, [
            next.name,
            next.slug,
            next.status,
            next.plan,
            next.storefrontEnabled ? true : false,
            next.manualBookingEnabled ? true : false,
            next.modules.citas ? true : false,
            next.modules.ventas ? true : false,
            next.modules.inventario ? true : false,
            next.billingCycle,
            next.planPriceMonthly,
            next.planPriceYearly,
            next.subscriptionStartedAt,
            next.currentPeriodStart,
            next.currentPeriodEnd,
            next.nextRenewalAt,
            tenantId,
        ]);
        return next;
    }
    async deleteTenant(tenantId) {
        const existing = await this.findTenantById(tenantId);
        if (!existing) {
            return false;
        }
        await this.exec(`DELETE FROM tenants WHERE id = ?`, [tenantId]);
        return true;
    }
    async getTenantBillingSnapshot(tenantId) {
        const tenant = await this.findTenantById(tenantId);
        if (!tenant) {
            return undefined;
        }
        const currentPeriodStart = tenant.currentPeriodStart;
        const currentPeriodEnd = tenant.currentPeriodEnd;
        const msTotal = Math.max(0, new Date(currentPeriodEnd).getTime() - new Date(currentPeriodStart).getTime());
        const nowMs = Date.now();
        const elapsedMs = Math.max(0, Math.min(msTotal, nowMs - new Date(currentPeriodStart).getTime()));
        const daysTotal = Math.max(1, Math.ceil(msTotal / (1000 * 60 * 60 * 24)));
        const daysElapsed = Math.min(daysTotal, Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24))));
        const daysRemaining = Math.max(0, daysTotal - daysElapsed);
        const progressPct = Math.max(0, Math.min(100, Number(((daysElapsed / daysTotal) * 100).toFixed(2))));
        return {
            cycle: tenant.billingCycle,
            currentPeriodStart,
            currentPeriodEnd,
            nextRenewalAt: tenant.nextRenewalAt,
            monthlyPrice: tenant.planPriceMonthly,
            yearlyPrice: tenant.planPriceYearly,
            daysTotal,
            daysElapsed,
            daysRemaining,
            progressPct,
        };
    }
    async getUpgradeQuote(params) {
        const tenant = await this.findTenantById(params.tenantId);
        if (!tenant) {
            return undefined;
        }
        const snapshot = await this.getTenantBillingSnapshot(params.tenantId);
        if (!snapshot) {
            return undefined;
        }
        const currentPrices = await this.getPlanCatalogPrices(tenant.plan);
        const targetPrices = await this.getPlanCatalogPrices(params.targetPlan);
        const currentCyclePrice = tenant.billingCycle === 'YEARLY' ? currentPrices.yearly : currentPrices.monthly;
        const targetCyclePrice = params.targetCycle === 'YEARLY' ? targetPrices.yearly : targetPrices.monthly;
        const ratioRemaining = snapshot.daysTotal > 0 ? snapshot.daysRemaining / snapshot.daysTotal : 0;
        const creditAmount = this.round2(currentCyclePrice * ratioRemaining);
        const targetCostForRemaining = this.round2(targetCyclePrice * ratioRemaining);
        const rawDue = this.round2(targetCostForRemaining - creditAmount);
        const amountDueNow = rawDue > 0 ? rawDue : 0;
        const carryOverBalance = rawDue < 0 ? this.round2(Math.abs(rawDue)) : 0;
        return {
            tenantId: params.tenantId,
            currentPlan: tenant.plan,
            targetPlan: params.targetPlan,
            currentCycle: tenant.billingCycle,
            targetCycle: params.targetCycle,
            period: {
                start: snapshot.currentPeriodStart,
                end: snapshot.currentPeriodEnd,
                totalDays: snapshot.daysTotal,
                remainingDays: snapshot.daysRemaining,
            },
            creditAmount,
            targetCostForRemaining,
            amountDueNow,
            carryOverBalance,
        };
    }
    async listPlanCatalog() {
        try {
            const rows = await this.queryRows(`SELECT plan_key, price_monthly, price_yearly FROM plan_catalog`);
            const mapped = rows.map((r) => ({
                planKey: String(r.plan_key),
                priceMonthly: Math.max(0, Number(r.price_monthly ?? 0)),
                priceYearly: Math.max(0, Number(r.price_yearly ?? 0)),
            }));
            const order = ['Trial', 'Básico', 'Pro', 'Negocio'];
            return mapped.sort((a, b) => order.indexOf(a.planKey) - order.indexOf(b.planKey));
        }
        catch {
            return [...DEFAULT_PLAN_CATALOG_SEED];
        }
    }
    async replacePlanCatalog(entries) {
        await this.ensurePlanCatalog();
        for (const e of entries) {
            await this.exec(`INSERT INTO plan_catalog (plan_key, price_monthly, price_yearly) VALUES (?, ?, ?)
         ON CONFLICT (plan_key) DO UPDATE SET
           price_monthly = EXCLUDED.price_monthly,
           price_yearly = EXCLUDED.price_yearly`, [e.planKey, e.priceMonthly, e.priceYearly]);
        }
        await this.syncTenantPlanPricesFromCatalog();
        return this.listPlanCatalog();
    }
    async listAppointmentsByTenantId(tenantId) {
        const rows = await this.queryRows(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE tenant_id = ?
        ORDER BY when_at ASC
      `, [tenantId]);
        return rows.map((row) => this.mapAppointmentRow(row));
    }
    async createAppointment(data) {
        const id = `appt_${Date.now()}`;
        const status = data.status ?? 'pendiente';
        const attendance = data.attendance ?? 'PENDIENTE';
        await this.exec(`
        INSERT INTO appointments (id, tenant_id, customer, service, when_at, status, attendance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, data.tenantId, data.customer, data.service, data.when, status, attendance]);
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
    async findAppointmentByTenantAndWhen(tenantId, when) {
        const row = await this.queryOne(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE tenant_id = ? AND when_at = ?
        LIMIT 1
      `, [tenantId, when]);
        return row ? this.mapAppointmentRow(row) : undefined;
    }
    async findAppointmentById(appointmentId) {
        const row = await this.queryOne(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance
        FROM appointments
        WHERE id = ?
      `, [appointmentId]);
        return row ? this.mapAppointmentRow(row) : undefined;
    }
    async updateAppointmentStatus(appointmentId, tenantId, status) {
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
    async updateAppointmentAttendance(appointmentId, tenantId, attendance) {
        const current = await this.findAppointmentById(appointmentId);
        if (!current || current.tenantId !== tenantId) {
            return undefined;
        }
        const status = attendance === 'ASISTIO'
            ? 'confirmada'
            : attendance === 'NO_ASISTIO'
                ? 'cancelada'
                : 'pendiente';
        await this.exec(`UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`, [attendance, status, appointmentId, tenantId]);
        return { ...current, attendance, status };
    }
    async confirmPublicAppointmentAttendance(slug, appointmentId, customerName) {
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
        const norm = (s) => s
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
        if (norm(appt.customer) !== norm(customerName)) {
            return undefined;
        }
        await this.exec(`UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`, ['ASISTIO', 'confirmada', appointmentId, tenant.id]);
        return { ...appt, attendance: 'ASISTIO', status: 'confirmada' };
    }
    async listStoreVisitsByTenantId(tenantId) {
        const rows = await this.queryRows(`
        SELECT id, tenant_id, customer, detail, created_at
        FROM store_visit_logs
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `, [tenantId]);
        return rows.map((row) => this.mapStoreVisitRow(row));
    }
    async createStoreVisitLog(data) {
        const id = `visit_${Date.now()}`;
        const createdAt = new Date().toISOString();
        await this.exec(`
        INSERT INTO store_visit_logs (id, tenant_id, customer, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [id, data.tenantId, data.customer, data.detail, createdAt]);
        return {
            id,
            tenantId: data.tenantId,
            customer: data.customer,
            detail: data.detail,
            createdAt,
        };
    }
    async listTenantSalesByTenantId(tenantId) {
        const rows = await this.queryRows(`
        SELECT id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at
        FROM tenant_sales
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `, [tenantId]);
        return rows.map((row) => this.mapTenantSaleRow(row));
    }
    async insertTenantSale(data) {
        const id = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const createdAt = new Date().toISOString();
        await this.exec(`
        INSERT INTO tenant_sales (id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
            id,
            data.tenantId,
            data.saleDate,
            this.round2(Math.max(0, Number(data.total) || 0)),
            data.method.trim(),
            data.linkedAppointmentId,
            data.stockNote,
            createdAt,
        ]);
        return {
            id,
            tenantId: data.tenantId,
            saleDate: data.saleDate,
            total: this.round2(Math.max(0, Number(data.total) || 0)),
            method: data.method.trim(),
            linkedAppointmentId: data.linkedAppointmentId,
            stockNote: data.stockNote,
            createdAt,
        };
    }
    async getTenantBranding(tenantId) {
        const row = await this.queryOne(`
        SELECT tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `, [tenantId]);
        if (row) {
            return this.mapTenantBrandingRow(row);
        }
        const tenant = await this.findTenantById(tenantId);
        return await this.ensureTenantBranding(tenantId, tenant?.name ?? 'Tu negocio');
    }
    async updateTenantBranding(tenantId, patch) {
        const current = await this.getTenantBranding(tenantId);
        const next = {
            ...current,
            ...patch,
            tenantId,
            logoUrl: patch.logoUrl === undefined
                ? current.logoUrl
                : patch.logoUrl === ''
                    ? null
                    : patch.logoUrl,
            catalogLayout: patch.catalogLayout === 'grid' || patch.catalogLayout === 'horizontal'
                ? patch.catalogLayout
                : current.catalogLayout,
        };
        await this.exec(`
        UPDATE tenant_branding
        SET display_name = ?, logo_url = ?, catalog_layout = ?, primary_color = ?, accent_color = ?, bg_color = ?, surface_color = ?, text_color = ?,
            border_radius_px = ?, use_gradient = ?, gradient_from = ?, gradient_to = ?, gradient_angle_deg = ?
        WHERE tenant_id = ?
      `, [
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
        ]);
        return next;
    }
    async listProductsByTenantId(tenantId) {
        const rows = await this.queryRows(`
        SELECT id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url
        FROM tenant_products
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `, [tenantId]);
        return rows.map((row) => this.mapTenantProductRow(row));
    }
    async createTenantProduct(tenantId, data) {
        const id = `prd_${Date.now()}`;
        const rowOrder = await this.queryOne(`SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_products WHERE tenant_id = ?`, [tenantId]);
        const catalogOrder = Number(rowOrder?.next_order ?? 0);
        await this.exec(`
        INSERT INTO tenant_products (id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
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
        ]);
        const list = await this.listProductsByTenantId(tenantId);
        return list.find((p) => p.id === id);
    }
    async updateTenantProduct(tenantId, productId, patch) {
        const list = await this.listProductsByTenantId(tenantId);
        const current = list.find((p) => p.id === productId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            ...patch,
            name: patch.name?.trim() ?? current.name,
            description: patch.description === undefined ? current.description : patch.description?.trim() || null,
            sku: patch.sku?.trim() ?? current.sku,
            price: patch.price === undefined ? current.price : Math.max(0, Number(patch.price) || 0),
            promoPrice: patch.promoPrice === undefined
                ? current.promoPrice
                : patch.promoPrice == null
                    ? null
                    : Math.max(0, Number(patch.promoPrice) || 0),
            stock: patch.stock === undefined
                ? current.stock
                : Math.max(0, Math.floor(Number(patch.stock) || 0)),
            imageUrl: patch.imageUrl === undefined
                ? current.imageUrl
                : patch.imageUrl === ''
                    ? null
                    : patch.imageUrl,
        };
        await this.exec(`
        UPDATE tenant_products
        SET name = ?, description = ?, price = ?, promo_price = ?, sku = ?, stock = ?, image_url = ?
        WHERE id = ? AND tenant_id = ?
      `, [
            next.name,
            next.description,
            next.price,
            next.promoPrice,
            next.sku,
            next.stock,
            next.imageUrl,
            productId,
            tenantId,
        ]);
        const after = await this.listProductsByTenantId(tenantId);
        return after.find((p) => p.id === productId);
    }
    async deleteTenantProduct(tenantId, productId) {
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
    async moveTenantProduct(tenantId, productId, direction) {
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
    async listServicesByTenantId(tenantId) {
        const rows = await this.queryRows(`
        SELECT id, tenant_id, name, description, price, promo_price, promo_label, catalog_order
        FROM tenant_services
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `, [tenantId]);
        return rows.map((row) => this.mapTenantServiceRow(row));
    }
    async createTenantService(tenantId, data) {
        const id = `svc_${Date.now()}`;
        const rowOrder = await this.queryOne(`SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_services WHERE tenant_id = ?`, [tenantId]);
        const catalogOrder = Number(rowOrder?.next_order ?? 0);
        await this.exec(`
        INSERT INTO tenant_services (id, tenant_id, name, description, price, promo_price, promo_label, catalog_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
            id,
            tenantId,
            data.name.trim(),
            data.description?.trim() || null,
            Math.max(0, Number(data.price) || 0),
            data.promoPrice == null ? null : Math.max(0, Number(data.promoPrice) || 0),
            data.promoLabel?.trim() || null,
            catalogOrder,
        ]);
        const list = await this.listServicesByTenantId(tenantId);
        return list.find((s) => s.id === id);
    }
    async updateTenantService(tenantId, serviceId, patch) {
        const list = await this.listServicesByTenantId(tenantId);
        const current = list.find((s) => s.id === serviceId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            ...patch,
            name: patch.name?.trim() ?? current.name,
            description: patch.description === undefined ? current.description : patch.description?.trim() || null,
            price: patch.price === undefined ? current.price : Math.max(0, Number(patch.price) || 0),
            promoPrice: patch.promoPrice === undefined
                ? current.promoPrice
                : patch.promoPrice == null
                    ? null
                    : Math.max(0, Number(patch.promoPrice) || 0),
            promoLabel: patch.promoLabel === undefined ? current.promoLabel : patch.promoLabel?.trim() || null,
        };
        await this.exec(`
        UPDATE tenant_services
        SET name = ?, description = ?, price = ?, promo_price = ?, promo_label = ?
        WHERE id = ? AND tenant_id = ?
      `, [next.name, next.description, next.price, next.promoPrice, next.promoLabel, serviceId, tenantId]);
        const after = await this.listServicesByTenantId(tenantId);
        return after.find((s) => s.id === serviceId);
    }
    async deleteTenantService(tenantId, serviceId) {
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
    async moveTenantService(tenantId, serviceId, direction) {
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
    async columnExists(table, column) {
        const row = await this.queryOne(`
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
            await this.execScript(`ALTER TABLE appointments ADD COLUMN attendance TEXT NOT NULL DEFAULT 'PENDIENTE'`);
        }
        if (!(await this.columnExists('tenants', 'plan'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'Trial'`);
        }
        if (!(await this.columnExists('tenants', 'storefront_enabled'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN storefront_enabled BOOLEAN NOT NULL DEFAULT false`);
        }
        if (!(await this.columnExists('tenants', 'manual_booking_enabled'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN manual_booking_enabled BOOLEAN NOT NULL DEFAULT true`);
        }
        if (!(await this.columnExists('tenants', 'billing_cycle'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY'`);
        }
        if (!(await this.columnExists('tenants', 'plan_price_monthly'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN plan_price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0`);
        }
        if (!(await this.columnExists('tenants', 'plan_price_yearly'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN plan_price_yearly NUMERIC(12,2) NOT NULL DEFAULT 0`);
        }
        if (!(await this.columnExists('tenants', 'subscription_started_at'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN subscription_started_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z'`);
        }
        if (!(await this.columnExists('tenants', 'current_period_start'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN current_period_start TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z'`);
        }
        if (!(await this.columnExists('tenants', 'current_period_end'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN current_period_end TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z'`);
        }
        if (!(await this.columnExists('tenants', 'next_renewal_at'))) {
            await this.execScript(`ALTER TABLE tenants ADD COLUMN next_renewal_at TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z'`);
        }
        const tenantRows = await this.queryRows(`SELECT id, name FROM tenants`);
        for (const t of tenantRows) {
            await this.ensureTenantBranding(String(t.id), String(t.name));
        }
        await this.ensurePlanCatalog();
        await this.ensurePlatformSiteConfig();
        await this.ensureTenantSalesTable();
        await this.syncTenantPlanPricesFromCatalog();
        await this.normalizeTenantBillingPeriods();
    }
    async createSchema() {
        await this.execScript(`
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
        await this.ensureIndex(`CREATE INDEX idx_store_visits_tenant_created ON store_visit_logs (tenant_id, created_at)`);
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
        await this.ensureIndex(`CREATE INDEX idx_tenant_products_tenant_order ON tenant_products (tenant_id, catalog_order)`);
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
        await this.ensureIndex(`CREATE INDEX idx_tenant_services_tenant_order ON tenant_services (tenant_id, catalog_order)`);
        await this.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_sales (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        sale_date TEXT NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        method TEXT NOT NULL,
        linked_appointment_id TEXT NULL,
        stock_note TEXT NULL,
        created_at TEXT NOT NULL,
        CONSTRAINT fk_sale_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
        await this.ensureIndex(`CREATE INDEX idx_tenant_sales_tenant_created ON tenant_sales (tenant_id, created_at DESC)`);
        await this.execScript(`
      CREATE TABLE IF NOT EXISTS platform_site_config (
        id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL
      )
    `);
    }
    async normalizeTenantBillingPeriods() {
        const tenants = await this.listTenants();
        const now = new Date();
        for (const tenant of tenants) {
            let start = new Date(tenant.currentPeriodStart);
            let end = new Date(tenant.currentPeriodEnd);
            const invalidRange = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start;
            if (invalidRange) {
                start = now;
                end = new Date(this.computeCycleEnd(start.toISOString(), tenant.billingCycle));
            }
            while (end < now) {
                start = end;
                end = new Date(this.computeCycleEnd(start.toISOString(), tenant.billingCycle));
            }
            const nextRenewalAt = end.toISOString();
            const changed = tenant.currentPeriodStart !== start.toISOString() ||
                tenant.currentPeriodEnd !== end.toISOString() ||
                tenant.nextRenewalAt !== nextRenewalAt;
            if (!changed) {
                continue;
            }
            await this.exec(`UPDATE tenants SET current_period_start = ?, current_period_end = ?, next_renewal_at = ? WHERE id = ?`, [start.toISOString(), end.toISOString(), nextRenewalAt, tenant.id]);
        }
    }
    async seedIfEmpty() {
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
        await this.ensureSeedUser({
            id: 'usr_super_1',
            email: 'super@azenda.dev',
            password: 'azenda123',
            role: auth_types_1.UserRole.SUPER_ADMIN,
            tenantId: null,
            systems: [auth_types_1.AppSystem.SUPER_ADMIN, auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'ACTIVE',
        });
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
        if (exists) {
            return;
        }
        await this.createUser(row);
    }
    async ensureTenantBranding(tenantId, tenantName) {
        const existing = await this.queryOne(`
        SELECT tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `, [tenantId]);
        if (existing) {
            return this.mapTenantBrandingRow(existing);
        }
        await this.exec(`
        INSERT INTO tenant_branding (
          tenant_id, display_name, logo_url, catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
          border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        ) VALUES (?, ?, ?, 'horizontal', '#4f46e5', '#06b6d4', '#f8fafc', '#ffffff', '#0f172a', 12, false, '#4f46e5', '#06b6d4', 135)
      `, [tenantId, tenantName, null]);
        return await this.getTenantBranding(tenantId);
    }
    computeCycleEnd(startIso, cycle) {
        const d = new Date(startIso);
        if (cycle === 'YEARLY') {
            d.setFullYear(d.getFullYear() + 1);
        }
        else {
            d.setMonth(d.getMonth() + 1);
        }
        return d.toISOString();
    }
    round2(value) {
        return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    }
    mergeTenantWithCatalog(t, catalog) {
        const p = catalog.get(t.plan);
        return {
            ...t,
            planPriceMonthly: p?.monthly ?? 0,
            planPriceYearly: p?.yearly ?? 0,
        };
    }
    async fetchPlanCatalogMap() {
        try {
            const rows = await this.queryRows(`SELECT plan_key, price_monthly, price_yearly FROM plan_catalog`);
            const m = new Map();
            for (const r of rows) {
                m.set(String(r.plan_key), {
                    monthly: Math.max(0, Number(r.price_monthly ?? 0)),
                    yearly: Math.max(0, Number(r.price_yearly ?? 0)),
                });
            }
            return m;
        }
        catch {
            return new Map(DEFAULT_PLAN_CATALOG_SEED.map((e) => [
                e.planKey,
                { monthly: e.priceMonthly, yearly: e.priceYearly },
            ]));
        }
    }
    async getPlanCatalogPrices(planKey) {
        try {
            const row = await this.queryOne(`SELECT price_monthly, price_yearly FROM plan_catalog WHERE plan_key = ?`, [planKey]);
            if (!row) {
                const fallback = DEFAULT_PLAN_CATALOG_SEED.find((e) => e.planKey === planKey);
                return {
                    monthly: fallback?.priceMonthly ?? 0,
                    yearly: fallback?.priceYearly ?? 0,
                };
            }
            return {
                monthly: Math.max(0, Number(row.price_monthly ?? 0)),
                yearly: Math.max(0, Number(row.price_yearly ?? 0)),
            };
        }
        catch {
            const fallback = DEFAULT_PLAN_CATALOG_SEED.find((e) => e.planKey === planKey);
            return {
                monthly: fallback?.priceMonthly ?? 0,
                yearly: fallback?.priceYearly ?? 0,
            };
        }
    }
    async syncTenantPlanPricesFromCatalog() {
        await this.exec(`
      UPDATE tenants
      SET plan_price_monthly = COALESCE(
            (SELECT price_monthly FROM plan_catalog c WHERE c.plan_key = tenants.plan),
            0
          ),
          plan_price_yearly = COALESCE(
            (SELECT price_yearly FROM plan_catalog c WHERE c.plan_key = tenants.plan),
            0
          )
    `);
    }
    async ensurePlanCatalog() {
        await this.execScript(`
      CREATE TABLE IF NOT EXISTS plan_catalog (
        plan_key TEXT PRIMARY KEY,
        price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
        price_yearly NUMERIC(12,2) NOT NULL DEFAULT 0
      )
    `);
        await this.execScript(`
      INSERT INTO plan_catalog (plan_key, price_monthly, price_yearly) VALUES
        ('Trial', 0, 0),
        ('Básico', 29, 290),
        ('Pro', 59, 590),
        ('Negocio', 99, 990)
      ON CONFLICT (plan_key) DO NOTHING
    `);
    }
    mergePlatformSiteConfig(base, patch) {
        const landing = { ...base.landing };
        if (patch.landing) {
            const keys = Object.keys(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG.landing);
            for (const key of keys) {
                const v = patch.landing[key];
                if (v !== undefined) {
                    landing[key] = v;
                }
            }
        }
        const out = { ...base, landing };
        if (patch.currencyCode !== undefined) {
            const t = String(patch.currencyCode).trim().slice(0, 12);
            if (t.length) {
                out.currencyCode = t;
            }
        }
        if (patch.currencySymbol !== undefined) {
            const t = String(patch.currencySymbol).slice(0, 8);
            if (t.length) {
                out.currencySymbol = t;
            }
        }
        if (patch.planPriceBasic !== undefined) {
            out.planPriceBasic = Math.min(1_000_000, Math.max(0, this.round2(Number(patch.planPriceBasic))));
        }
        if (patch.planPricePro !== undefined) {
            out.planPricePro = Math.min(1_000_000, Math.max(0, this.round2(Number(patch.planPricePro))));
        }
        if (patch.planPriceBusiness !== undefined) {
            out.planPriceBusiness = Math.min(1_000_000, Math.max(0, this.round2(Number(patch.planPriceBusiness))));
        }
        return out;
    }
    async ensurePlatformSiteConfig() {
        const payload = JSON.stringify(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG);
        await this.execScript(`
      CREATE TABLE IF NOT EXISTS platform_site_config (
        id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL
      )
    `);
        await this.exec(`INSERT INTO platform_site_config (id, payload_json) VALUES ('default', ?) ON CONFLICT (id) DO NOTHING`, [payload]);
    }
    async ensureTenantSalesTable() {
        await this.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_sales (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        sale_date TEXT NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        method TEXT NOT NULL,
        linked_appointment_id TEXT NULL,
        stock_note TEXT NULL,
        created_at TEXT NOT NULL,
        CONSTRAINT fk_sale_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
        await this.ensureIndex(`CREATE INDEX IF NOT EXISTS idx_tenant_sales_tenant_created ON tenant_sales (tenant_id, created_at DESC)`);
    }
    async getPlatformSiteConfig() {
        await this.ensurePlatformSiteConfig();
        const row = await this.queryOne(`SELECT payload_json FROM platform_site_config WHERE id = 'default'`);
        if (!row?.payload_json) {
            return structuredClone(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG);
        }
        try {
            const parsed = JSON.parse(String(row.payload_json));
            return this.mergePlatformSiteConfig(structuredClone(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG), parsed);
        }
        catch {
            return structuredClone(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG);
        }
    }
    async patchPlatformSiteConfig(patch) {
        const current = await this.getPlatformSiteConfig();
        const next = this.mergePlatformSiteConfig(current, patch);
        const json = JSON.stringify(next);
        await this.exec(`UPDATE platform_site_config SET payload_json = ? WHERE id = 'default'`, [json]);
        return next;
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
        const billingCycleRaw = String(row.billing_cycle ?? 'MONTHLY');
        const billingCycle = billingCycleRaw === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
        const currentPeriodStart = String(row.current_period_start ?? '2026-01-01T00:00:00.000Z');
        const currentPeriodEnd = String(row.current_period_end ?? '2026-02-01T00:00:00.000Z');
        const nextRenewalAt = String(row.next_renewal_at ?? currentPeriodEnd);
        return {
            id: String(row.id),
            name: String(row.name),
            slug: String(row.slug),
            status: row.status,
            plan,
            storefrontEnabled: Boolean(row.storefront_enabled),
            manualBookingEnabled: Boolean(row.manual_booking_enabled),
            billingCycle,
            planPriceMonthly: Math.max(0, Number(row.plan_price_monthly ?? 0)),
            planPriceYearly: Math.max(0, Number(row.plan_price_yearly ?? 0)),
            subscriptionStartedAt: String(row.subscription_started_at ?? currentPeriodStart),
            currentPeriodStart,
            currentPeriodEnd,
            nextRenewalAt,
            modules: {
                citas: Boolean(row.citas_enabled),
                ventas: Boolean(row.ventas_enabled),
                inventario: Boolean(row.inventario_enabled),
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
    mapTenantSaleRow(row) {
        return {
            id: String(row.id),
            tenantId: String(row.tenant_id),
            saleDate: String(row.sale_date),
            total: Math.max(0, Number(row.total) || 0),
            method: String(row.method),
            linkedAppointmentId: row.linked_appointment_id == null ? null : String(row.linked_appointment_id),
            stockNote: row.stock_note == null ? null : String(row.stock_note),
            createdAt: String(row.created_at),
        };
    }
    mapTenantBrandingRow(row) {
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
    mapTenantProductRow(row) {
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
    mapTenantServiceRow(row) {
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
};
exports.SqlDbService = SqlDbService;
exports.SqlDbService = SqlDbService = SqlDbService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SqlDbService);
//# sourceMappingURL=sql-db.service.js.map