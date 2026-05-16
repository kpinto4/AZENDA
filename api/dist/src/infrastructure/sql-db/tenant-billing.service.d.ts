import { BillingCycle, TenantBillingSnapshot } from './sql-db.types';
import { TenantRepository } from './repositories/tenant.repository';
export declare class TenantBillingService {
    private readonly tenants;
    constructor(tenants: TenantRepository);
    private round2;
    getTenantBillingSnapshot(tenantId: string): Promise<TenantBillingSnapshot | undefined>;
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
