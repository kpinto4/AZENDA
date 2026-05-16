import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppSystem, UserRole } from '../../auth/auth.types';
import {
  AppointmentAttendance,
  AppointmentEntity,
  AppointmentStatus,
  BillingCycle,
  PlanCatalogEntry,
  PlatformSiteConfig,
  PlatformSiteLandingCopy,
  StoreVisitLogEntity,
  TenantBillingSnapshot,
  TenantBrandingEntity,
  TenantEntity,
  TenantProductEntity,
  TenantSaleEntity,
  TenantServiceEntity,
  UserEntity,
} from './sql-db.types';
import { AppointmentRepository } from './repositories/appointment.repository';
import { PlatformSiteConfigRepository } from './repositories/platform-site-config.repository';
import { TenantBrandingRepository } from './repositories/tenant-branding.repository';
import { PgClientService } from './pg-client.service';
import { TenantCatalogRepository } from './repositories/tenant-catalog.repository';
import { TenantRetailRepository } from './repositories/tenant-retail.repository';
import { TenantRepository } from './repositories/tenant.repository';
import { UserRepository } from './repositories/user.repository';
import { TenantBillingService } from './tenant-billing.service';

@Injectable()
export class SqlDbService implements OnModuleInit {
  private readonly logger = new Logger(SqlDbService.name);

  constructor(
    private readonly pg: PgClientService,
    private readonly users: UserRepository,
    private readonly tenants: TenantRepository,
    private readonly appointments: AppointmentRepository,
    private readonly catalog: TenantCatalogRepository,
    private readonly retail: TenantRetailRepository,
    private readonly tenantBranding: TenantBrandingRepository,
    private readonly platformSite: PlatformSiteConfigRepository,
    private readonly tenantBilling: TenantBillingService,
  ) {}

  async onModuleInit(): Promise<void> {
    const runOnStart = ['1', 'true', 'yes', 'on'].includes(
      String(process.env.DB_BOOTSTRAP_ON_START ?? '').trim().toLowerCase(),
    );
    if (runOnStart) {
      await this.runBootstrapInternal('arranque (DB_BOOTSTRAP_ON_START)');
      return;
    }
    await this.pingOrThrow();
    await this.createSchema();
    await this.ensureSchemaMigrations();
    await this.users.migrateLegacyPlaintextPasswords();
    this.logger.log(
      'PostgreSQL: tablas y migraciones ligeras verificadas en el arranque. ' +
        'Semilla (usuarios demo): npm run db:bootstrap en la raiz si la base esta vacia. ' +
        'DB_BOOTSTRAP_ON_START=1 fuerza bootstrap en cada arranque.',
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
    try {
      await this.pg.queryRows('SELECT 1');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isConn =
        code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN';
      if (isConn) {
        this.logger.error(
          `No hay conexion a PostgreSQL via DATABASE_URL. ` +
            `Verifica credenciales/red de Neon y vuelve a intentar. ` +
            `Semilla inicial: npm run db:bootstrap.`,
        );
      }
      throw err;
    }
  }

  private async runBootstrapInternal(context: string): Promise<void> {
    try {
      await this.createSchema();
      await this.ensureSchemaMigrations();
      await this.users.migrateLegacyPlaintextPasswords();
      await this.seedIfEmpty();
      this.logger.log(`PostgreSQL listo (${context}): esquema y semilla verificados`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const isConn =
        code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN';
      if (isConn) {
        this.logger.error(
          'No hay conexion a PostgreSQL via DATABASE_URL. Verifica Neon y ejecuta npm run db:bootstrap.',
        );
      }
      throw err;
    }
  }

  async findUserByEmailNormalized(normalizedEmail: string): Promise<UserEntity | undefined> {
    return this.users.findByEmailNormalized(normalizedEmail);
  }

  async findUserById(userId: string): Promise<UserEntity | undefined> {
    return this.users.findById(userId);
  }

  async listUsers(): Promise<UserEntity[]> {
    return this.users.listAll();
  }

  async listUsersByTenantId(tenantId: string): Promise<UserEntity[]> {
    return this.users.listByTenantId(tenantId);
  }

  async createUser(data: UserEntity): Promise<UserEntity> {
    return this.users.create(data);
  }

  async updateUser(
    userId: string,
    patch: Partial<Omit<UserEntity, 'id'>>,
  ): Promise<UserEntity | undefined> {
    return this.users.update(userId, patch);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.users.delete(userId);
  }

  async deleteUserByTenant(userId: string, tenantId: string): Promise<boolean> {
    return this.users.deleteByTenant(userId, tenantId);
  }

  async listTenants(): Promise<TenantEntity[]> {
    return this.tenants.listTenants();
  }

  async findTenantBySlug(slug: string): Promise<TenantEntity | undefined> {
    return this.tenants.findBySlug(slug);
  }

  async findTenantById(tenantId: string): Promise<TenantEntity | undefined> {
    return this.tenants.findById(tenantId);
  }

  async createTenant(
    data: Omit<
      TenantEntity,
      | 'manualBookingEnabled'
      | 'billingCycle'
      | 'planPriceMonthly'
      | 'planPriceYearly'
      | 'subscriptionStartedAt'
      | 'currentPeriodStart'
      | 'currentPeriodEnd'
      | 'nextRenewalAt'
    > & {
      manualBookingEnabled?: boolean;
      billingCycle?: BillingCycle;
      planPriceMonthly?: number;
      planPriceYearly?: number;
      subscriptionStartedAt?: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      nextRenewalAt?: string;
    },
  ): Promise<TenantEntity> {
    return this.tenants.createTenant(data);
  }

  async updateTenant(
    tenantId: string,
    patch: Omit<Partial<TenantEntity>, 'modules'> & {
      modules?: Partial<TenantEntity['modules']>;
    },
  ): Promise<TenantEntity | undefined> {
    return this.tenants.updateTenant(tenantId, patch);
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    return this.tenants.deleteTenant(tenantId);
  }

  async getTenantBillingSnapshot(tenantId: string): Promise<TenantBillingSnapshot | undefined> {
    return this.tenantBilling.getTenantBillingSnapshot(tenantId);
  }

  async getUpgradeQuote(params: {
    tenantId: string;
    targetPlan: string;
    targetCycle: BillingCycle;
  }): Promise<{
    tenantId: string;
    currentPlan: string;
    targetPlan: string;
    currentCycle: BillingCycle;
    targetCycle: BillingCycle;
    period: { start: string; end: string; totalDays: number; remainingDays: number };
    creditAmount: number;
    targetCostForRemaining: number;
    amountDueNow: number;
    carryOverBalance: number;
  } | undefined> {
    return this.tenantBilling.getUpgradeQuote(params);
  }

  async listAppointmentsByTenantId(tenantId: string): Promise<AppointmentEntity[]> {
    return this.appointments.listByTenantId(tenantId);
  }

  async createAppointment(data: {
    tenantId: string;
    customer: string;
    service: string;
    when: string;
    status?: AppointmentStatus;
    attendance?: AppointmentAttendance;
    customerPhoneE164?: string | null;
    waReminderConsent?: boolean;
  }): Promise<AppointmentEntity> {
    return this.appointments.create(data);
  }

  async markAppointmentReminderSentForTenant(
    appointmentId: string,
    tenantId: string,
  ): Promise<AppointmentEntity | undefined> {
    return this.appointments.markReminderSentForTenant(appointmentId, tenantId);
  }

  async findAppointmentByTenantAndWhen(
    tenantId: string,
    when: string,
  ): Promise<AppointmentEntity | undefined> {
    return this.appointments.findByTenantAndWhen(tenantId, when);
  }

  async findAppointmentById(appointmentId: string): Promise<AppointmentEntity | undefined> {
    return this.appointments.findById(appointmentId);
  }

  async updateAppointmentWhenAndService(
    tenantId: string,
    appointmentId: string,
    when: string,
    service: string,
  ): Promise<AppointmentEntity | undefined> {
    return this.appointments.updateWhenAndService(tenantId, appointmentId, when, service);
  }

  async updateAppointmentStatus(
    appointmentId: string,
    tenantId: string,
    status: AppointmentStatus,
  ): Promise<AppointmentEntity | undefined> {
    return this.appointments.updateStatus(appointmentId, tenantId, status);
  }

  async updateAppointmentAttendance(
    appointmentId: string,
    tenantId: string,
    attendance: AppointmentAttendance,
  ): Promise<AppointmentEntity | undefined> {
    return this.appointments.updateAttendance(appointmentId, tenantId, attendance);
  }

  async confirmPublicAppointmentAttendance(
    slug: string,
    appointmentId: string,
    customerName: string,
  ): Promise<AppointmentEntity | undefined> {
    return this.appointments.confirmPublicAttendance(slug, appointmentId, customerName);
  }

  async lookupPublicAppointmentsForClient(
    slug: string,
    customerNameRaw: string | undefined | null,
    appointmentIdRaw?: string | null,
    customerPhoneRaw?: string | null,
  ): Promise<AppointmentEntity[]> {
    return this.appointments.lookupPublicForClient(slug, customerNameRaw, appointmentIdRaw, customerPhoneRaw);
  }

  async listStoreVisitsByTenantId(tenantId: string): Promise<StoreVisitLogEntity[]> {
    return this.retail.listStoreVisitsByTenantId(tenantId);
  }

  async createStoreVisitLog(data: {
    tenantId: string;
    customer: string;
    detail: string;
  }): Promise<StoreVisitLogEntity> {
    return this.retail.createStoreVisitLog(data);
  }

  async listTenantSalesByTenantId(tenantId: string): Promise<TenantSaleEntity[]> {
    return this.retail.listTenantSalesByTenantId(tenantId);
  }

  async insertTenantSale(data: {
    tenantId: string;
    saleDate: string;
    total: number;
    method: string;
    linkedAppointmentId: string | null;
    stockNote: string | null;
  }): Promise<TenantSaleEntity> {
    return this.retail.insertTenantSale(data);
  }

  async getTenantBranding(tenantId: string): Promise<TenantBrandingEntity> {
    return this.tenantBranding.get(tenantId);
  }

  async updateTenantBranding(
    tenantId: string,
    patch: Partial<Omit<TenantBrandingEntity, 'tenantId'>>,
  ): Promise<TenantBrandingEntity> {
    return this.tenantBranding.update(tenantId, patch);
  }

  async listProductsByTenantId(tenantId: string): Promise<TenantProductEntity[]> {
    return this.catalog.listProductsByTenantId(tenantId);
  }

  async createTenantProduct(
    tenantId: string,
    data: Omit<TenantProductEntity, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantProductEntity> {
    return this.catalog.createTenantProduct(tenantId, data);
  }

  async updateTenantProduct(
    tenantId: string,
    productId: string,
    patch: Omit<Partial<TenantProductEntity>, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantProductEntity | undefined> {
    return this.catalog.updateTenantProduct(tenantId, productId, patch);
  }

  async deleteTenantProduct(tenantId: string, productId: string): Promise<boolean> {
    return this.catalog.deleteTenantProduct(tenantId, productId);
  }

  async moveTenantProduct(tenantId: string, productId: string, direction: -1 | 1): Promise<void> {
    return this.catalog.moveTenantProduct(tenantId, productId, direction);
  }

  async listServicesByTenantId(tenantId: string): Promise<TenantServiceEntity[]> {
    return this.catalog.listServicesByTenantId(tenantId);
  }

  async createTenantService(
    tenantId: string,
    data: Omit<TenantServiceEntity, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantServiceEntity> {
    return this.catalog.createTenantService(tenantId, data);
  }

  async updateTenantService(
    tenantId: string,
    serviceId: string,
    patch: Omit<Partial<TenantServiceEntity>, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantServiceEntity | undefined> {
    return this.catalog.updateTenantService(tenantId, serviceId, patch);
  }

  async deleteTenantService(tenantId: string, serviceId: string): Promise<boolean> {
    return this.catalog.deleteTenantService(tenantId, serviceId);
  }

  async moveTenantService(tenantId: string, serviceId: string, direction: -1 | 1): Promise<void> {
    return this.catalog.moveTenantService(tenantId, serviceId, direction);
  }

  private async columnExists(table: string, column: string): Promise<boolean> {
    const row = await this.pg.queryOne(
      `
        SELECT 1 AS ok
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND lower(table_name) = lower(?)
          AND lower(column_name) = lower(?)
      `,
      [table, column],
    );
    return Boolean(row);
  }

  private async ensureSchemaMigrations(): Promise<void> {
    if (!(await this.columnExists('appointments', 'attendance'))) {
      await this.pg.execScript(
        `ALTER TABLE appointments ADD COLUMN attendance TEXT NOT NULL DEFAULT 'PENDIENTE'`,
      );
    }

    if (!(await this.columnExists('tenants', 'plan'))) {
      await this.pg.execScript(`ALTER TABLE tenants ADD COLUMN plan TEXT NOT NULL DEFAULT 'Trial'`);
    }
    if (!(await this.columnExists('tenants', 'storefront_enabled'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN storefront_enabled BOOLEAN NOT NULL DEFAULT false`,
      );
    }
    if (!(await this.columnExists('tenants', 'manual_booking_enabled'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN manual_booking_enabled BOOLEAN NOT NULL DEFAULT true`,
      );
    }
    if (!(await this.columnExists('tenants', 'billing_cycle'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY'`,
      );
    }
    if (!(await this.columnExists('tenants', 'plan_price_monthly'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN plan_price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0`,
      );
    }
    if (!(await this.columnExists('tenants', 'plan_price_yearly'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN plan_price_yearly NUMERIC(12,2) NOT NULL DEFAULT 0`,
      );
    }
    if (!(await this.columnExists('tenants', 'subscription_started_at'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN subscription_started_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z'`,
      );
    }
    if (!(await this.columnExists('tenants', 'current_period_start'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN current_period_start TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z'`,
      );
    }
    if (!(await this.columnExists('tenants', 'current_period_end'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN current_period_end TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z'`,
      );
    }
    if (!(await this.columnExists('tenants', 'next_renewal_at'))) {
      await this.pg.execScript(
        `ALTER TABLE tenants ADD COLUMN next_renewal_at TEXT NOT NULL DEFAULT '2026-02-01T00:00:00.000Z'`,
      );
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
      await this.pg.execScript(
        `ALTER TABLE appointments ADD COLUMN wa_reminder_consent BOOLEAN NOT NULL DEFAULT false`,
      );
    }
    if (!(await this.columnExists('appointments', 'wa_reminder_sent_at'))) {
      await this.pg.execScript(`ALTER TABLE appointments ADD COLUMN wa_reminder_sent_at TEXT NULL`);
    }

    const tenantRows = await this.pg.queryRows(`SELECT id, name FROM tenants`);
    for (const t of tenantRows) {
      await this.tenants.ensureDefaultBranding(String(t.id), String(t.name));
    }
    await this.tenants.ensurePlanCatalogTable();
    await this.platformSite.ensureTableAndDefaultRow();
    await this.retail.ensureSalesTable();
    await this.tenants.syncTenantPlanPricesFromCatalog();
    await this.normalizeTenantBillingPeriods();
  }

  private async createSchema(): Promise<void> {
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

    await this.pg.ensureIndex(
      `CREATE INDEX idx_store_visits_tenant_created ON store_visit_logs (tenant_id, created_at)`,
    );

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

    await this.pg.ensureIndex(
      `CREATE INDEX idx_tenant_products_tenant_order ON tenant_products (tenant_id, catalog_order)`,
    );

    await this.pg.execScript(`
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

    await this.pg.ensureIndex(
      `CREATE INDEX idx_tenant_services_tenant_order ON tenant_services (tenant_id, catalog_order)`,
    );

    await this.retail.ensureSalesTable();

    await this.platformSite.ensureTableAndDefaultRow();
  }

  private async normalizeTenantBillingPeriods(): Promise<void> {
    const tenants = await this.listTenants();
    const now = new Date();
    for (const tenant of tenants) {
      let start = new Date(tenant.currentPeriodStart);
      let end = new Date(tenant.currentPeriodEnd);
      const invalidRange = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start;
      if (invalidRange) {
        start = now;
        end = new Date(this.tenants.computeBillingCycleEnd(start.toISOString(), tenant.billingCycle));
      }
      while (end < now) {
        start = end;
        end = new Date(this.tenants.computeBillingCycleEnd(start.toISOString(), tenant.billingCycle));
      }
      const nextRenewalAt = end.toISOString();
      const changed =
        tenant.currentPeriodStart !== start.toISOString() ||
        tenant.currentPeriodEnd !== end.toISOString() ||
        tenant.nextRenewalAt !== nextRenewalAt;
      if (!changed) {
        continue;
      }
      await this.pg.exec(
        `UPDATE tenants SET current_period_start = ?, current_period_end = ?, next_renewal_at = ? WHERE id = ?`,
        [start.toISOString(), end.toISOString(), nextRenewalAt, tenant.id],
      );
    }
  }

  private async seedIfEmpty(): Promise<void> {
    const countRow = await this.pg.queryOne(`SELECT COUNT(*) AS cnt FROM users`);
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
    row: Omit<
      TenantEntity,
      | 'manualBookingEnabled'
      | 'billingCycle'
      | 'planPriceMonthly'
      | 'planPriceYearly'
      | 'subscriptionStartedAt'
      | 'currentPeriodStart'
      | 'currentPeriodEnd'
      | 'nextRenewalAt'
    > & {
      manualBookingEnabled?: boolean;
      billingCycle?: BillingCycle;
      planPriceMonthly?: number;
      planPriceYearly?: number;
      subscriptionStartedAt?: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      nextRenewalAt?: string;
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

  async getPlanCatalogPrices(planKey: string): Promise<{ monthly: number; yearly: number }> {
    return this.tenants.getPlanCatalogPrices(planKey);
  }

  async listPlanCatalog(): Promise<PlanCatalogEntry[]> {
    return this.tenants.listPlanCatalog();
  }

  async replacePlanCatalog(entries: PlanCatalogEntry[]): Promise<PlanCatalogEntry[]> {
    return this.tenants.replacePlanCatalog(entries);
  }

  async getPlatformSiteConfig(): Promise<PlatformSiteConfig> {
    return this.platformSite.get();
  }

  async patchPlatformSiteConfig(
    patch: Partial<PlatformSiteConfig> & { landing?: Partial<PlatformSiteLandingCopy> },
  ): Promise<PlatformSiteConfig> {
    return this.platformSite.patch(patch);
  }

}
