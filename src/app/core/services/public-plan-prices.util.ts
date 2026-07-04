import { ApiPlanCatalogEntry } from './api-plan-catalog.service';

export type PublicCommercialPlanKey = 'Básico' | 'Pro' | 'Negocio';

export interface PublicPlanPriceRow {
  monthly: number;
  yearly: number;
}

const COMMERCIAL_PLANS: PublicCommercialPlanKey[] = ['Básico', 'Pro', 'Negocio'];

/** Precios de lista si el API no responde (alineados con `plan-catalog.defaults` del backend). */
export const DEFAULT_PUBLIC_PLAN_PRICES: Record<
  PublicCommercialPlanKey,
  PublicPlanPriceRow
> = {
  Básico: { monthly: 39_900, yearly: 399_000 },
  Pro: { monthly: 69_900, yearly: 699_000 },
  Negocio: { monthly: 99_900, yearly: 999_000 },
};

function normalizePlanKey(key: string): string {
  return key
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const PLAN_ALIASES: Record<string, PublicCommercialPlanKey> = {
  basico: 'Básico',
  pro: 'Pro',
  negocio: 'Negocio',
};

/** Mapea filas de `plan_catalog` a precios mensual/anual por plan comercial. */
export function mapPublicPlanCatalogPrices(
  entries: ApiPlanCatalogEntry[],
): Record<PublicCommercialPlanKey, PublicPlanPriceRow> {
  const out: Record<PublicCommercialPlanKey, PublicPlanPriceRow> = {
    Básico: { ...DEFAULT_PUBLIC_PLAN_PRICES.Básico },
    Pro: { ...DEFAULT_PUBLIC_PLAN_PRICES.Pro },
    Negocio: { ...DEFAULT_PUBLIC_PLAN_PRICES.Negocio },
  };

  for (const entry of entries) {
    const alias =
      PLAN_ALIASES[normalizePlanKey(entry.planKey)] ??
      (COMMERCIAL_PLANS.includes(entry.planKey as PublicCommercialPlanKey)
        ? (entry.planKey as PublicCommercialPlanKey)
        : null);
    if (!alias) {
      continue;
    }
    out[alias] = {
      monthly: Math.max(0, Number(entry.priceMonthly ?? 0)),
      yearly: Math.max(0, Number(entry.priceYearly ?? 0)),
    };
  }

  return out;
}
