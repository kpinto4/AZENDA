import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
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

export type CreateTenantInput = Omit<
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
  adminEmail: string;
  adminPassword: string;
};

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

  private async enrichTenant(t: TenantEntity): Promise<AdminTenantListRow> {
    const users = await this.sqlDb.listUsersByTenantId(t.id);
    const admin = users.find((u) => u.role === UserRole.ADMIN);
    return {
      ...t,
      adminEmail: admin?.email ?? null,
    };
  }

  async listTenants(): Promise<AdminTenantListRow[]> {
    const rows = await this.tenants.listTenants();
    const enriched: AdminTenantListRow[] = [];
    for (const t of rows) {
      enriched.push(await this.enrichTenant(t));
    }
    return enriched;
  }

  async findById(tenantId: string): Promise<AdminTenantListRow | undefined> {
    const t = await this.tenants.findById(tenantId);
    if (!t) {
      return undefined;
    }
    return this.enrichTenant(t);
  }

  async createTenant(data: CreateTenantInput): Promise<AdminTenantListRow> {
    const adminEmail = data.adminEmail.trim().toLowerCase();
    const existing = await this.sqlDb.findUserByEmailNormalized(adminEmail);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    const { adminEmail: _e, adminPassword, ...tenantData } = data;
    const tenant = await this.tenants.createTenant(tenantData);
    await this.sqlDb.createUser({
      id: `usr_${Date.now()}`,
      email: adminEmail,
      password: adminPassword,
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    });
    return this.enrichTenant(tenant);
  }

  /**
   * Crea el usuario admin de un negocio que quedó sin cuenta de acceso.
   */
  async ensureAdminAccess(
    tenantId: string,
    adminEmail: string,
    adminPassword: string,
  ): Promise<AdminTenantListRow> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    const users = await this.sqlDb.listUsersByTenantId(tenantId);
    const hasAdmin = users.some((u) => u.role === UserRole.ADMIN);
    if (hasAdmin) {
      throw new ConflictException('Este negocio ya tiene un usuario admin');
    }

    const email = adminEmail.trim().toLowerCase();
    const existing = await this.sqlDb.findUserByEmailNormalized(email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }

    await this.sqlDb.createUser({
      id: `usr_${Date.now()}`,
      email,
      password: adminPassword,
      role: UserRole.ADMIN,
      tenantId,
      systems: [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING],
      status: 'ACTIVE',
    });
    return this.enrichTenant(tenant);
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
