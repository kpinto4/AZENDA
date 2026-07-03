import { Injectable } from '@nestjs/common';
import { PgClientService } from '../pg-client.service';
import { DEFAULT_PLAN_CATALOG_SEED } from '../plan-catalog.defaults';
import {
  BillingCycle,
  PlanCatalogEntry,
  TenantBrandingEntity,
  TenantEntity,
} from '../sql-db.types';
import { mapTenantBrandingRow } from '../tenant-branding-row.mapper';

@Injectable()
export class TenantRepository {
  constructor(private readonly pg: PgClientService) {}

  private computeCycleEnd(startIso: string, cycle: BillingCycle): string {
    const d = new Date(startIso);
    if (cycle === 'YEARLY') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString();
  }

  private mapTenantRow(row: Record<string, unknown>): TenantEntity {
    const planRaw = row.plan;
    const plan =
      typeof planRaw === 'string' && planRaw.length ? planRaw : 'Trial';
    const billingCycleRaw = String(row.billing_cycle ?? 'MONTHLY');
    const billingCycle: BillingCycle =
      billingCycleRaw === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
    const currentPeriodStart = String(
      row.current_period_start ?? '2026-01-01T00:00:00.000Z',
    );
    const currentPeriodEnd = String(
      row.current_period_end ?? '2026-02-01T00:00:00.000Z',
    );
    const nextRenewalAt = String(row.next_renewal_at ?? currentPeriodEnd);
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      status: row.status as TenantEntity['status'],
      plan,
      storefrontEnabled: Boolean(row.storefront_enabled),
      manualBookingEnabled: Boolean(row.manual_booking_enabled),
      billingCycle,
      planPriceMonthly: Math.max(0, Number(row.plan_price_monthly ?? 0)),
      planPriceYearly: Math.max(0, Number(row.plan_price_yearly ?? 0)),
      subscriptionStartedAt: String(
        row.subscription_started_at ?? currentPeriodStart,
      ),
      currentPeriodStart,
      currentPeriodEnd,
      nextRenewalAt,
      modules: {
        citas: Boolean(row.citas_enabled),
        ventas: Boolean(row.ventas_enabled),
        inventario: Boolean(row.inventario_enabled),
      },
      isDemoTenant: Boolean(row.is_demo_tenant),
      subscriptionStatus: this.parseSubscriptionStatus(row.subscription_status),
      billingCustomized: Boolean(row.billing_customized),
      billingNotes: String(row.billing_notes ?? ''),
    };
  }

  private tenantSelectColumns(): string {
    return `
        id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled
             , billing_cycle, plan_price_monthly, plan_price_yearly, subscription_started_at, current_period_start, current_period_end, next_renewal_at
             , is_demo_tenant, subscription_status, billing_customized, billing_notes
    `;
  }

  private parseSubscriptionStatus(
    raw: unknown,
  ): TenantEntity['subscriptionStatus'] {
    const v = String(raw ?? 'active').trim();
    if (
      v === 'pending_payment' ||
      v === 'active' ||
      v === 'past_due' ||
      v === 'canceled'
    ) {
      return v;
    }
    return 'active';
  }

  private mergeTenantWithCatalog(
    t: TenantEntity,
    catalog: Map<string, { monthly: number; yearly: number }>,
  ): TenantEntity {
    if (t.billingCustomized) {
      return t;
    }
    const p = catalog.get(t.plan);
    return {
      ...t,
      planPriceMonthly: p?.monthly ?? t.planPriceMonthly,
      planPriceYearly: p?.yearly ?? t.planPriceYearly,
    };
  }

  async fetchPlanCatalogMap(): Promise<
    Map<string, { monthly: number; yearly: number }>
  > {
    try {
      const rows = await this.pg.queryRows(
        `SELECT plan_key, price_monthly, price_yearly FROM plan_catalog`,
      );
      const m = new Map<string, { monthly: number; yearly: number }>();
      for (const r of rows) {
        m.set(String(r.plan_key), {
          monthly: Math.max(0, Number(r.price_monthly ?? 0)),
          yearly: Math.max(0, Number(r.price_yearly ?? 0)),
        });
      }
      return m;
    } catch {
      return new Map(
        DEFAULT_PLAN_CATALOG_SEED.map((e) => [
          e.planKey,
          { monthly: e.priceMonthly, yearly: e.priceYearly },
        ]),
      );
    }
  }

  async getPlanCatalogPrices(
    planKey: string,
  ): Promise<{ monthly: number; yearly: number }> {
    try {
      const row = await this.pg.queryOne(
        `SELECT price_monthly, price_yearly FROM plan_catalog WHERE plan_key = ?`,
        [planKey],
      );
      if (!row) {
        const fallback = DEFAULT_PLAN_CATALOG_SEED.find(
          (e) => e.planKey === planKey,
        );
        return {
          monthly: fallback?.priceMonthly ?? 0,
          yearly: fallback?.priceYearly ?? 0,
        };
      }
      return {
        monthly: Math.max(0, Number(row.price_monthly ?? 0)),
        yearly: Math.max(0, Number(row.price_yearly ?? 0)),
      };
    } catch {
      const fallback = DEFAULT_PLAN_CATALOG_SEED.find(
        (e) => e.planKey === planKey,
      );
      return {
        monthly: fallback?.priceMonthly ?? 0,
        yearly: fallback?.priceYearly ?? 0,
      };
    }
  }

  async listTenants(): Promise<TenantEntity[]> {
    const catalog = await this.fetchPlanCatalogMap();
    const rows = await this.pg.queryRows(
      `
        SELECT ${this.tenantSelectColumns()}
        FROM tenants
        ORDER BY name ASC
      `,
    );
    return rows.map((row) =>
      this.mergeTenantWithCatalog(
        this.mapTenantRow(row as Record<string, unknown>),
        catalog,
      ),
    );
  }

  async findBySlug(slug: string): Promise<TenantEntity | undefined> {
    const row = await this.pg.queryOne(
      `
        SELECT ${this.tenantSelectColumns()}
        FROM tenants
        WHERE slug = ?
      `,
      [slug],
    );
    if (!row) {
      return undefined;
    }
    const t = this.mapTenantRow(row as Record<string, unknown>);
    return this.mergeTenantWithCatalog(t, await this.fetchPlanCatalogMap());
  }

  async findById(tenantId: string): Promise<TenantEntity | undefined> {
    const row = await this.pg.queryOne(
      `
        SELECT ${this.tenantSelectColumns()}
        FROM tenants
        WHERE id = ?
      `,
      [tenantId],
    );
    if (!row) {
      return undefined;
    }
    const t = this.mapTenantRow(row as Record<string, unknown>);
    return this.mergeTenantWithCatalog(t, await this.fetchPlanCatalogMap());
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
      | 'subscriptionStatus'
    > & {
      manualBookingEnabled?: boolean;
      billingCycle?: BillingCycle;
      planPriceMonthly?: number;
      planPriceYearly?: number;
      subscriptionStartedAt?: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      nextRenewalAt?: string;
      subscriptionStatus?: TenantEntity['subscriptionStatus'];
    },
  ): Promise<TenantEntity> {
    const now = new Date();
    const defaultCycle: BillingCycle = data.billingCycle ?? 'MONTHLY';
    const periodStart = data.currentPeriodStart ?? now.toISOString();
    const periodEnd =
      data.currentPeriodEnd ?? this.computeCycleEnd(periodStart, defaultCycle);
    const plan = data.plan ?? 'Trial';
    const catalogPrices = await this.getPlanCatalogPrices(plan);
    const row: TenantEntity = {
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
      subscriptionStatus: data.subscriptionStatus ?? 'active',
    };
    await this.pg.exec(
      `
        INSERT INTO tenants (
          id, name, slug, status, plan, storefront_enabled, manual_booking_enabled, citas_enabled, ventas_enabled, inventario_enabled,
          billing_cycle, plan_price_monthly, plan_price_yearly, subscription_started_at, current_period_start, current_period_end, next_renewal_at,
          subscription_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        row.billingCycle,
        row.planPriceMonthly,
        row.planPriceYearly,
        row.subscriptionStartedAt,
        row.currentPeriodStart,
        row.currentPeriodEnd,
        row.nextRenewalAt,
        row.subscriptionStatus ?? 'active',
      ],
    );

    await this.ensureDefaultBranding(row.id, row.name);
    return (await this.findById(row.id)) ?? row;
  }

  async updateTenant(
    tenantId: string,
    patch: Omit<Partial<TenantEntity>, 'modules'> & {
      modules?: Partial<TenantEntity['modules']>;
    },
  ): Promise<TenantEntity | undefined> {
    const current = await this.findById(tenantId);
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
      billingCycle: patch.billingCycle ?? current.billingCycle,
      planPriceMonthly: current.planPriceMonthly,
      planPriceYearly: current.planPriceYearly,
      subscriptionStartedAt:
        patch.subscriptionStartedAt ?? current.subscriptionStartedAt,
      currentPeriodStart:
        patch.currentPeriodStart ?? current.currentPeriodStart,
      currentPeriodEnd: patch.currentPeriodEnd ?? current.currentPeriodEnd,
      nextRenewalAt: patch.nextRenewalAt ?? current.nextRenewalAt,
      subscriptionStatus:
        patch.subscriptionStatus ?? current.subscriptionStatus ?? 'active',
      billingCustomized:
        patch.billingCustomized !== undefined
          ? patch.billingCustomized
          : (current.billingCustomized ?? false),
      billingNotes:
        patch.billingNotes !== undefined
          ? patch.billingNotes
          : (current.billingNotes ?? ''),
      modules: {
        ...current.modules,
        ...(patch.modules ?? {}),
      },
    };

    if (next.billingCustomized) {
      if (patch.planPriceMonthly !== undefined) {
        next.planPriceMonthly = Math.max(0, patch.planPriceMonthly);
      }
      if (patch.planPriceYearly !== undefined) {
        next.planPriceYearly = Math.max(0, patch.planPriceYearly);
      }
    } else {
      const catalogPrices = await this.getPlanCatalogPrices(next.plan);
      next.planPriceMonthly = catalogPrices.monthly;
      next.planPriceYearly = catalogPrices.yearly;
    }

    await this.pg.exec(
      `
        UPDATE tenants
        SET name = ?, slug = ?, status = ?, plan = ?, storefront_enabled = ?, manual_booking_enabled = ?,
            citas_enabled = ?, ventas_enabled = ?, inventario_enabled = ?, billing_cycle = ?,
            plan_price_monthly = ?, plan_price_yearly = ?, subscription_started_at = ?,
            current_period_start = ?, current_period_end = ?, next_renewal_at = ?,
            subscription_status = ?, billing_customized = ?, billing_notes = ?
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
        next.billingCycle,
        next.planPriceMonthly,
        next.planPriceYearly,
        next.subscriptionStartedAt,
        next.currentPeriodStart,
        next.currentPeriodEnd,
        next.nextRenewalAt,
        next.subscriptionStatus ?? 'active',
        next.billingCustomized ? true : false,
        next.billingNotes ?? '',
        tenantId,
      ],
    );

    return next;
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    const existing = await this.findById(tenantId);
    if (!existing) {
      return false;
    }
    await this.pg.exec(`DELETE FROM tenants WHERE id = ?`, [tenantId]);
    return true;
  }

  /**
   * Inserta fila por defecto en `tenant_branding` si no existe (tras crear tenant).
   */
  async ensureDefaultBranding(
    tenantId: string,
    tenantName: string,
  ): Promise<TenantBrandingEntity> {
    const existing = await this.pg.queryOne(
      `
        SELECT tenant_id, display_name, logo_url, public_address, public_maps_url, cancellation_policy, reminder_notice,
               whatsapp_phone_e164, whatsapp_default_message, public_booking_hours_json,
               catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `,
      [tenantId],
    );
    if (existing) {
      return mapTenantBrandingRow(existing as Record<string, unknown>);
    }
    await this.pg.exec(
      `
        INSERT INTO tenant_branding (
          tenant_id, display_name, logo_url, public_address, public_maps_url, cancellation_policy, reminder_notice,
          whatsapp_phone_e164, whatsapp_default_message, public_booking_hours_json,
          catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
          border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        ) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'horizontal', '#4f46e5', '#06b6d4', '#f8fafc', '#ffffff', '#0f172a', 12, false, '#4f46e5', '#06b6d4', 135)
      `,
      [tenantId, tenantName, null],
    );
    const loaded = await this.pg.queryOne(
      `
        SELECT tenant_id, display_name, logo_url, public_address, public_maps_url, cancellation_policy, reminder_notice,
               whatsapp_phone_e164, whatsapp_default_message, public_booking_hours_json,
               catalog_layout, primary_color, accent_color, bg_color, surface_color, text_color,
               border_radius_px, use_gradient, gradient_from, gradient_to, gradient_angle_deg
        FROM tenant_branding
        WHERE tenant_id = ?
      `,
      [tenantId],
    );
    if (!loaded) {
      throw new Error(
        `No se pudo cargar tenant_branding tras insert (${tenantId}).`,
      );
    }
    return mapTenantBrandingRow(loaded as Record<string, unknown>);
  }

  /** Expuesto para `computeCycleEnd` fuera del repo (p. ej. normalización de periodos). */
  computeBillingCycleEnd(startIso: string, cycle: BillingCycle): string {
    return this.computeCycleEnd(startIso, cycle);
  }

  async listPlanCatalog(): Promise<PlanCatalogEntry[]> {
    try {
      const rows = await this.pg.queryRows(
        `SELECT plan_key, price_monthly, price_yearly, operating_cost_approx FROM plan_catalog`,
      );
      const mapped: PlanCatalogEntry[] = rows.map((r) => ({
        planKey: String(r.plan_key),
        priceMonthly: Math.max(0, Number(r.price_monthly ?? 0)),
        priceYearly: Math.max(0, Number(r.price_yearly ?? 0)),
        operatingCostApprox: Math.max(0, Number(r.operating_cost_approx ?? 0)),
      }));
      const order = ['Trial', 'Básico', 'Pro', 'Negocio'];
      return mapped.sort(
        (a, b) => order.indexOf(a.planKey) - order.indexOf(b.planKey),
      );
    } catch {
      return [...DEFAULT_PLAN_CATALOG_SEED];
    }
  }

  async replacePlanCatalog(
    entries: PlanCatalogEntry[],
  ): Promise<PlanCatalogEntry[]> {
    await this.ensurePlanCatalogTable();
    for (const e of entries) {
      await this.pg.exec(
        `INSERT INTO plan_catalog (plan_key, price_monthly, price_yearly, operating_cost_approx) VALUES (?, ?, ?, ?)
         ON CONFLICT (plan_key) DO UPDATE SET
           price_monthly = EXCLUDED.price_monthly,
           price_yearly = EXCLUDED.price_yearly,
           operating_cost_approx = EXCLUDED.operating_cost_approx`,
        [e.planKey, e.priceMonthly, e.priceYearly, e.operatingCostApprox],
      );
    }
    await this.syncTenantPlanPricesFromCatalog();
    return this.listPlanCatalog();
  }

  async ensurePlanCatalogTable(): Promise<void> {
    await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS plan_catalog (
        plan_key TEXT PRIMARY KEY,
        price_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
        price_yearly NUMERIC(12,2) NOT NULL DEFAULT 0,
        operating_cost_approx NUMERIC(12,2) NOT NULL DEFAULT 0
      )
    `);
    await this.pg.execScript(
      `ALTER TABLE plan_catalog ADD COLUMN IF NOT EXISTS operating_cost_approx NUMERIC(12,2) NOT NULL DEFAULT 0`,
    );
    await this.pg.execScript(`
      INSERT INTO plan_catalog (plan_key, price_monthly, price_yearly, operating_cost_approx) VALUES
        ('Trial', 0, 0, 0),
        ('Básico', 39900, 399000, 3800),
        ('Pro', 69900, 699000, 4500),
        ('Negocio', 99900, 999000, 6000)
      ON CONFLICT (plan_key) DO NOTHING
    `);
  }

  async syncTenantPlanPricesFromCatalog(): Promise<void> {
    await this.pg.exec(`
      UPDATE tenants
      SET plan_price_monthly = COALESCE(
            (SELECT price_monthly FROM plan_catalog c WHERE c.plan_key = tenants.plan),
            0
          ),
          plan_price_yearly = COALESCE(
            (SELECT price_yearly FROM plan_catalog c WHERE c.plan_key = tenants.plan),
            0
          )
      WHERE COALESCE(billing_customized, false) = false
    `);
  }
}
