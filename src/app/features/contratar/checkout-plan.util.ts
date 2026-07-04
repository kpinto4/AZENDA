import { CommercialPlanKey } from './checkout.config';

const COMMERCIAL_PLANS: CommercialPlanKey[] = ['Básico', 'Pro', 'Negocio'];

const PLAN_ALIASES: Record<string, CommercialPlanKey> = {
  basico: 'Básico',
  pro: 'Pro',
  negocio: 'Negocio',
};

export function asCommercialPlan(
  plan: string | null | undefined,
): CommercialPlanKey | null {
  if (!plan?.trim()) {
    return null;
  }
  const raw = plan.trim();
  if (COMMERCIAL_PLANS.includes(raw as CommercialPlanKey)) {
    return raw as CommercialPlanKey;
  }
  const alias = PLAN_ALIASES[
    raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  ];
  return alias ?? null;
}
