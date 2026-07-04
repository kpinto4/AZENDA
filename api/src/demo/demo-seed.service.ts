import { Injectable, Logger } from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_USER_ID,
  DEMO_CORE_PRODUCTS,
  DEMO_CORE_SERVICES,
  DEMO_EMPLOYEE_EMAIL,
  DEMO_EMPLOYEE_USER_ID,
  DEMO_SEED_PASSWORD,
  DEMO_TENANT_ID,
  DEMO_TENANT_NAME,
  DEMO_TENANT_SLUG,
  DEMO_VOLATILE_APPOINTMENTS,
  DEMO_VOLATILE_SALES,
  appendEmployeeToServiceLabel,
  formatAppointmentWhen,
  formatSaleDate,
} from '../../scripts/demo-tenant.snapshot';
import { PgClientService } from '../infrastructure/sql-db/pg-client.service';

@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    private readonly pg: PgClientService,
    private readonly passwordService: PasswordService,
  ) {}

  /** Idempotente: tenant demo, usuarios, catálogo core y muestra volátil si faltan. */
  async ensureDemoTenantSeed(): Promise<void> {
    await this.ensureDemoTenantRow();
    await this.ensureDemoUsers();
    await this.ensureCoreCatalog();
    const apptCount = await this.countRows('appointments', DEMO_TENANT_ID);
    if (apptCount === 0) {
      await this.insertVolatileSample();
    }
  }

  async insertVolatileSample(now = new Date()): Promise<void> {
    for (const appt of DEMO_VOLATILE_APPOINTMENTS) {
      const when = formatAppointmentWhen(appt.offsetMinutes, now);
      const service = appendEmployeeToServiceLabel(
        appt.serviceName,
        appt.employeeId,
      );
      await this.pg.exec(
        `
          INSERT INTO appointments (
            id, tenant_id, customer, service, when_at, status, attendance,
            customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at, duration_minutes
          )
          VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE', NULL, false, NULL, 30)
          ON CONFLICT (id) DO NOTHING
        `,
        [appt.id, DEMO_TENANT_ID, appt.customer, service, when, appt.status],
      );
    }

    for (const sale of DEMO_VOLATILE_SALES) {
      const saleDate = formatSaleDate(sale.daysAgo, now);
      const createdAt = new Date(
        now.getTime() - sale.daysAgo * 86_400_000,
      ).toISOString();
      await this.pg.exec(
        `
          INSERT INTO tenant_sales (id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at)
          VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)
          ON CONFLICT (id) DO NOTHING
        `,
        [sale.id, DEMO_TENANT_ID, saleDate, sale.total, sale.method, createdAt],
      );
    }
  }

  async restoreCoreCatalogFromSnapshot(): Promise<void> {
    for (const svc of DEMO_CORE_SERVICES) {
      await this.pg.exec(
        `
          UPDATE tenant_services
          SET name = ?, description = ?, price = ?, duration_minutes = ?, catalog_order = ?
          WHERE id = ? AND tenant_id = ?
        `,
        [
          svc.name,
          svc.description,
          svc.price,
          svc.durationMinutes,
          svc.catalogOrder,
          svc.id,
          DEMO_TENANT_ID,
        ],
      );
    }
    for (const prd of DEMO_CORE_PRODUCTS) {
      await this.pg.exec(
        `
          UPDATE tenant_products
          SET name = ?, description = ?, price = ?, sku = ?, stock = ?, catalog_order = ?
          WHERE id = ? AND tenant_id = ?
        `,
        [
          prd.name,
          prd.description,
          prd.price,
          prd.sku,
          prd.stock,
          prd.catalogOrder,
          prd.id,
          DEMO_TENANT_ID,
        ],
      );
    }
  }

  private async ensureDemoTenantRow(): Promise<void> {
    const exists = await this.pg.queryOne(
      `SELECT id FROM tenants WHERE id = ?`,
      [DEMO_TENANT_ID],
    );
    if (!exists) {
      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await this.pg.exec(
        `
          INSERT INTO tenants (
            id, name, slug, status, plan, storefront_enabled, manual_booking_enabled,
            citas_enabled, ventas_enabled, inventario_enabled,
            billing_cycle, plan_price_monthly, plan_price_yearly,
            subscription_started_at, current_period_start, current_period_end, next_renewal_at,
            is_demo_tenant
          )
          VALUES (?, ?, ?, 'ACTIVE', 'Negocio', true, true, true, true, true,
                  'MONTHLY', 0, 0, ?, ?, ?, ?, true)
        `,
        [
          DEMO_TENANT_ID,
          DEMO_TENANT_NAME,
          DEMO_TENANT_SLUG,
          now,
          now,
          periodEnd.toISOString(),
          periodEnd.toISOString(),
        ],
      );
      await this.pg.exec(
        `
          INSERT INTO tenant_branding (tenant_id, display_name, logo_url)
          VALUES (?, ?, NULL)
          ON CONFLICT (tenant_id) DO NOTHING
        `,
        [DEMO_TENANT_ID, DEMO_TENANT_NAME],
      );
      this.logger.log(`Tenant demo creado: ${DEMO_TENANT_ID}`);
      return;
    }
    await this.pg.exec(
      `UPDATE tenants SET is_demo_tenant = true, plan = 'Negocio',
        citas_enabled = true, ventas_enabled = true, inventario_enabled = true,
        storefront_enabled = true, manual_booking_enabled = true, status = 'ACTIVE'
       WHERE id = ?`,
      [DEMO_TENANT_ID],
    );
  }

  private async ensureDemoUsers(): Promise<void> {
    const hash = await this.passwordService.hash(DEMO_SEED_PASSWORD);
    await this.upsertUser({
      id: DEMO_ADMIN_USER_ID,
      email: DEMO_ADMIN_EMAIL,
      password: hash,
      role: UserRole.ADMIN,
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
    });
    await this.upsertUser({
      id: DEMO_EMPLOYEE_USER_ID,
      email: DEMO_EMPLOYEE_EMAIL,
      password: hash,
      role: UserRole.EMPLEADO,
      systems: [AppSystem.TENANT],
    });
  }

  private async upsertUser(row: {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    systems: AppSystem[];
  }): Promise<void> {
    const systemsJson = JSON.stringify(row.systems);
    const exists = await this.pg.queryOne(`SELECT id FROM users WHERE id = ?`, [
      row.id,
    ]);
    if (!exists) {
      await this.pg.exec(
        `
          INSERT INTO users (id, email, password, role, tenant_id, systems, status)
          VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        `,
        [
          row.id,
          row.email,
          row.password,
          row.role,
          DEMO_TENANT_ID,
          systemsJson,
        ],
      );
      return;
    }
    await this.pg.exec(
      `UPDATE users SET email = ?, role = ?, tenant_id = ?, systems = ?, status = 'ACTIVE' WHERE id = ?`,
      [row.email, row.role, DEMO_TENANT_ID, systemsJson, row.id],
    );
  }

  private async ensureCoreCatalog(): Promise<void> {
    for (const svc of DEMO_CORE_SERVICES) {
      await this.pg.exec(
        `
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
        `,
        [
          svc.id,
          DEMO_TENANT_ID,
          svc.name,
          svc.description,
          svc.price,
          svc.durationMinutes,
          svc.catalogOrder,
        ],
      );
    }
    for (const prd of DEMO_CORE_PRODUCTS) {
      await this.pg.exec(
        `
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
        `,
        [
          prd.id,
          DEMO_TENANT_ID,
          prd.name,
          prd.description,
          prd.price,
          prd.sku,
          prd.stock,
          prd.catalogOrder,
        ],
      );
    }
  }

  private async countRows(table: string, tenantId: string): Promise<number> {
    const row = await this.pg.queryOne(
      `SELECT COUNT(*) AS cnt FROM ${table} WHERE tenant_id = ?`,
      [tenantId],
    );
    return Number(row?.cnt ?? 0);
  }
}
