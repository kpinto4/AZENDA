import { PlanCatalogEntry } from './sql-db.types';

/** Precios por defecto si falla lectura de `plan_catalog`. */
export const DEFAULT_PLAN_CATALOG_SEED: PlanCatalogEntry[] = [
  { planKey: 'Trial', priceMonthly: 0, priceYearly: 0 },
  { planKey: 'Básico', priceMonthly: 29, priceYearly: 290 },
  { planKey: 'Pro', priceMonthly: 59, priceYearly: 590 },
  { planKey: 'Negocio', priceMonthly: 99, priceYearly: 990 },
];
