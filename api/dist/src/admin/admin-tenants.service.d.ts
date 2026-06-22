import { BillingCycle, TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { TenantBillingService } from '../infrastructure/sql-db/tenant-billing.service';
import { TenantRepository } from '../infrastructure/sql-db/repositories/tenant.repository';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
export interface AdminTenantListRow extends TenantEntity {
    adminEmail: string | null;
}
export declare class AdminTenantsService {
    private readonly tenants;
    private readonly billing;
    private readonly sqlDb;
    constructor(tenants: TenantRepository, billing: TenantBillingService, sqlDb: SqlDbService);
    private computeCycleEnd;
    listTenants(): Promise<AdminTenantListRow[]>;
    findById(tenantId: string): Promise<TenantEntity | undefined>;
    createTenant(data: Omit<TenantEntity, 'manualBookingEnabled' | 'billingCycle' | 'planPriceMonthly' | 'planPriceYearly' | 'subscriptionStartedAt' | 'currentPeriodStart' | 'currentPeriodEnd' | 'nextRenewalAt'> & {
        manualBookingEnabled?: boolean;
        billingCycle?: BillingCycle;
        planPriceMonthly?: number;
        planPriceYearly?: number;
        subscriptionStartedAt?: string;
        currentPeriodStart?: string;
        currentPeriodEnd?: string;
        nextRenewalAt?: string;
    }): Promise<TenantEntity>;
    updateTenant(tenantId: string, patch: Omit<Partial<TenantEntity>, 'modules'> & {
        modules?: Partial<TenantEntity['modules']>;
    }): Promise<TenantEntity | undefined>;
    activateSubscription(tenantId: string): Promise<TenantEntity>;
    deleteTenant(tenantId: string): Promise<boolean>;
    getUpgradeQuote(params: {
        tenantId: string;
        targetPlan: string;
        targetCycle: BillingCycle;
    }): Promise<{
        tenantId: string;
        currentPlan: string;
        targetPlan: string;
        currentCycle: BillingCycle;
        targetCycle: BillingCycle;
        period: {
            start: string;
            end: string;
            totalDays: number;
            remainingDays: number;
        };
        creditAmount: number;
        targetCostForRemaining: number;
        amountDueNow: number;
        carryOverBalance: number;
    } | undefined>;
}
