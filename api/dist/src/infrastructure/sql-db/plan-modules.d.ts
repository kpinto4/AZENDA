export interface TenantModuleFlags {
    citas: boolean;
    ventas: boolean;
    inventario: boolean;
}
export declare function defaultModulesForPlan(plan: string): TenantModuleFlags;
