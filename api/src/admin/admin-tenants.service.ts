import { Injectable } from '@nestjs/common';
import {
  BillingCycle,
  TenantEntity,
} from '../infrastructure/sql-db/sql-db.types';
import { TenantBillingService } from '../infrastructure/sql-db/tenant-billing.service';
import { TenantRepository } from '../infrastructure/sql-db/repositories/tenant.repository';

@Injectable()
export class AdminTenantsService {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly billing: TenantBillingService,
  ) {}

  listTenants(): Promise<TenantEntity[]> {
    return this.tenants.listTenants();
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

  deleteTenant(tenantId: string): Promise<boolean> {
    return this.tenants.deleteTenant(tenantId);
  }

  getUpgradeQuote(params: {
    tenantId: string;
    targetPlan: string;
    targetCycle: BillingCycle;
  }) {
    return this.billing.getUpgradeQuote(params);
  }
}
