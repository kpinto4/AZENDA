import { PgClientService } from '../pg-client.service';
export interface PlatformOverviewStats {
    tenantCount: number;
    activeTenantCount: number;
    appointmentCount: number;
    salesCount: number;
    salesTotalCop: number;
    tenantPanelUserCount: number;
    stockMovementsCount: number;
    tenantsWithModuleCitas: number;
    tenantsWithModuleVentas: number;
    tenantsWithModuleInventario: number;
    estimatedMrrMonthlyCop: number;
}
export declare class PlatformStatsRepository {
    private readonly pg;
    constructor(pg: PgClientService);
    private n;
    loadOverview(): Promise<PlatformOverviewStats>;
}
