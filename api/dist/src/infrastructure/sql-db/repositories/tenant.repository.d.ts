import { PgClientService } from '../pg-client.service';
import { BillingCycle, PlanCatalogEntry, TenantBrandingEntity, TenantEntity } from '../sql-db.types';
export declare class TenantRepository {
    private readonly pg;
    constructor(pg: PgClientService);
    private computeCycleEnd;
    private mapTenantRow;
    private parseSubscriptionStatus;
    private mergeTenantWithCatalog;
    fetchPlanCatalogMap(): Promise<Map<string, {
        monthly: number;
        yearly: number;
    }>>;
    getPlanCatalogPrices(planKey: string): Promise<{
        monthly: number;
        yearly: number;
    }>;
    listTenants(): Promise<TenantEntity[]>;
    findBySlug(slug: string): Promise<TenantEntity | undefined>;
    findById(tenantId: string): Promise<TenantEntity | undefined>;
    createTenant(data: Omit<TenantEntity, 'manualBookingEnabled' | 'billingCycle' | 'planPriceMonthly' | 'planPriceYearly' | 'subscriptionStartedAt' | 'currentPeriodStart' | 'currentPeriodEnd' | 'nextRenewalAt' | 'subscriptionStatus'> & {
        manualBookingEnabled?: boolean;
        billingCycle?: BillingCycle;
        planPriceMonthly?: number;
        planPriceYearly?: number;
        subscriptionStartedAt?: string;
        currentPeriodStart?: string;
        currentPeriodEnd?: string;
        nextRenewalAt?: string;
        subscriptionStatus?: TenantEntity['subscriptionStatus'];
    }): Promise<TenantEntity>;
    updateTenant(tenantId: string, patch: Omit<Partial<TenantEntity>, 'modules'> & {
        modules?: Partial<TenantEntity['modules']>;
    }): Promise<TenantEntity | undefined>;
    deleteTenant(tenantId: string): Promise<boolean>;
    ensureDefaultBranding(tenantId: string, tenantName: string): Promise<TenantBrandingEntity>;
    computeBillingCycleEnd(startIso: string, cycle: BillingCycle): string;
    listPlanCatalog(): Promise<PlanCatalogEntry[]>;
    replacePlanCatalog(entries: PlanCatalogEntry[]): Promise<PlanCatalogEntry[]>;
    ensurePlanCatalogTable(): Promise<void>;
    syncTenantPlanPricesFromCatalog(): Promise<void>;
}
