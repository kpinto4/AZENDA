/** Ciclo anual en checkout y asignación por tenant — habilitar en una versión futura. */
export const ANNUAL_BILLING_ENABLED = false;

export type BillingCycleOption = 'MONTHLY' | 'YEARLY';

export function normalizeBillingCycle(cycle: BillingCycleOption): BillingCycleOption {
  return ANNUAL_BILLING_ENABLED && cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
}
