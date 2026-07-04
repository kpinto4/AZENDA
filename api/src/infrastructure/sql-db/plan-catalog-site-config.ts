import { PlanCatalogEntry, PlatformSiteConfig } from './sql-db.types';

const PLAN_KEY_TO_SITE_PRICE: Record<
  string,
  keyof Pick<
    PlatformSiteConfig,
    'planPriceBasic' | 'planPricePro' | 'planPriceBusiness'
  >
> = {
  Básico: 'planPriceBasic',
  Pro: 'planPricePro',
  Negocio: 'planPriceBusiness',
};

function normalizePlanKey(key: string): string {
  return key
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function sitePriceFieldForPlanKey(
  planKey: string,
):
  | keyof Pick<
      PlatformSiteConfig,
      'planPriceBasic' | 'planPricePro' | 'planPriceBusiness'
    >
  | undefined {
  const direct = PLAN_KEY_TO_SITE_PRICE[planKey];
  if (direct) {
    return direct;
  }
  const normalized = normalizePlanKey(planKey);
  for (const [key, field] of Object.entries(PLAN_KEY_TO_SITE_PRICE)) {
    if (normalizePlanKey(key) === normalized) {
      return field;
    }
  }
  return undefined;
}

export function planCatalogPricePatch(
  entries: PlanCatalogEntry[],
): Partial<
  Pick<
    PlatformSiteConfig,
    'planPriceBasic' | 'planPricePro' | 'planPriceBusiness'
  >
> {
  const patch: Partial<
    Pick<
      PlatformSiteConfig,
      'planPriceBasic' | 'planPricePro' | 'planPriceBusiness'
    >
  > = {};
  for (const entry of entries) {
    const field = sitePriceFieldForPlanKey(entry.planKey);
    if (field && entry.priceMonthly != null) {
      patch[field] = entry.priceMonthly;
    }
  }
  return patch;
}

export function applyPlanCatalogPricesToSiteConfig(
  config: PlatformSiteConfig,
  entries: PlanCatalogEntry[],
): PlatformSiteConfig {
  const patch = planCatalogPricePatch(entries);
  if (Object.keys(patch).length === 0) {
    return config;
  }
  return { ...config, ...patch };
}
