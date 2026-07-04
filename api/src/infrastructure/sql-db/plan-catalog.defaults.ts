import { PlanCatalogEntry } from './sql-db.types';

/** Precios por defecto si falla lectura de `plan_catalog`. */
export const DEFAULT_PLAN_CATALOG_SEED: PlanCatalogEntry[] = [
  { planKey: 'Trial', priceMonthly: 0, priceYearly: 0, operatingCostApprox: 0 },
  {
    planKey: 'Básico',
    priceMonthly: 39_900,
    priceYearly: 399_000,
    operatingCostApprox: 3_800,
  },
  {
    planKey: 'Pro',
    priceMonthly: 69_900,
    priceYearly: 699_000,
    operatingCostApprox: 4_500,
  },
  {
    planKey: 'Negocio',
    priceMonthly: 99_900,
    priceYearly: 999_000,
    operatingCostApprox: 6_000,
  },
];
