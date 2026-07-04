import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../auth/auth.types';
import { defaultModulesForPlan } from '../infrastructure/sql-db/plan-modules';
import {
  BillingCycle,
  TenantEntity,
} from '../infrastructure/sql-db/sql-db.types';
import { TenantBillingService } from '../infrastructure/sql-db/tenant-billing.service';
import { TenantRepository } from '../infrastructure/sql-db/repositories/tenant.repository';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';

export interface AdminTenantListRow extends TenantEntity {
  adminEmail: string | null;
}

@Injectable()
export class AdminTenantsService {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly billing: TenantBillingService,
    private readonly sqlDb: SqlDbService,
  ) {}
  private computeCycleEnd(startIso: string, cycle: BillingCycle): string {
    const d = new Date(startIso);
    if (cycle === 'YEARLY') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString();
  }

  async listTenants(): Promise<AdminTenantListRow[]> {
    const rows = await this.tenants.listTenants();
    const enriched: AdminTenantListRow[] = [];
    for (const t of rows) {
      const users = await this.sqlDb.listUsersByTenantId(t.id);
      const admin = users.find((u) => u.role === UserRole.ADMIN);
      enriched.push({
        ...t,
        adminEmail: admin?.email ?? null,
      });
    }
    return enriched;
  }

  findById(tenantId: string): Promise<TenantEntity | undefined> {
    return this.tenants.findById(tenantId);
  }

  createTenant(
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

  updateTenant(
    tenantId: string,
    patch: Omit<Partial<TenantEntity>, 'modules'> & {
      modules?: Partial<TenantEntity['modules']>;
    },
  ): Promise<TenantEntity | undefined> {
    return this.tenants.updateTenant(tenantId, patch);
  }

  async activateSubscription(tenantId: string): Promise<TenantEntity> {
    const current = await this.tenants.findById(tenantId);
    if (!current) {
      throw new NotFoundException('Tenant no encontrado');
    }
    if (current.isDemoTenant) {
      throw new NotFoundException('No aplica al tenant demo');
    }

    const now = new Date().toISOString();
    const periodEnd = this.computeCycleEnd(now, current.billingCycle);
    const modules = defaultModulesForPlan(current.plan);

    const updated = await this.tenants.updateTenant(tenantId, {
      status: 'ACTIVE',
      subscriptionStatus: 'active',
      subscriptionStartedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextRenewalAt: periodEnd,
      modules,
    });
    if (!updated) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return updated;
  }

  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      return await this.tenants.deleteTenant(tenantId);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al eliminar el tenant';
      throw new InternalServerErrorException(
        `No se pudo eliminar el negocio: ${message}`,
      );
    }
  }

  getUpgradeQuote(params: {
    tenantId: string;
    targetPlan: string;
    targetCycle: BillingCycle;
  }) {
    return this.billing.getUpgradeQuote(params);
  }
}
