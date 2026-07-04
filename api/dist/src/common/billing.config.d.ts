export type BillingCycle = 'MONTHLY' | 'YEARLY';
export declare function isAnnualBillingEnabled(): boolean;
export declare function normalizeBillingCycle(cycle?: BillingCycle | string | null): BillingCycle;
