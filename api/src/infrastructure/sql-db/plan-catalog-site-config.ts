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
    const field = PLAN_KEY_TO_SITE_PRICE[entry.planKey];
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
