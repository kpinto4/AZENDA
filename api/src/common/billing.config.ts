export type BillingCycle = 'MONTHLY' | 'YEARLY';

/** `AZENDA_ANNUAL_BILLING=true` habilita ciclo anual (versión futura). */
export function isAnnualBillingEnabled(): boolean {
  return (
    (process.env.AZENDA_ANNUAL_BILLING ?? '').trim().toLowerCase() === 'true'
  );
}

export function normalizeBillingCycle(
  cycle?: BillingCycle | string | null,
): BillingCycle {
  if (isAnnualBillingEnabled() && cycle === 'YEARLY') {
    return 'YEARLY';
  }
  return 'MONTHLY';
}
