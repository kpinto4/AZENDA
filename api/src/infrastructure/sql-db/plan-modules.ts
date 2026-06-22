/** Módulos habilitados por plan comercial (Trial, Básico, Pro, Negocio). */
export interface TenantModuleFlags {
  citas: boolean;
  ventas: boolean;
  inventario: boolean;
}

/** Módulos iniciales según plan; alineado con super-admin y landing. */
export function defaultModulesForPlan(plan: string): TenantModuleFlags {
  switch (plan) {
    case 'Trial':
      return { citas: true, ventas: false, inventario: false };
    case 'Básico':
      return { citas: true, ventas: true, inventario: false };
    case 'Pro':
    case 'Negocio':
      return { citas: true, ventas: true, inventario: true };
    default:
      return { citas: true, ventas: false, inventario: false };
  }
}
