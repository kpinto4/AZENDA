import { PlatformSiteConfigRepository } from '../infrastructure/sql-db/repositories/platform-site-config.repository';
import { PlanCatalogEntry } from '../infrastructure/sql-db/sql-db.types';
import { TenantRepository } from '../infrastructure/sql-db/repositories/tenant.repository';
export declare class AdminPlanCatalogService {
    private readonly tenants;
    private readonly platformSite;
    constructor(tenants: TenantRepository, platformSite: PlatformSiteConfigRepository);
    list(): Promise<PlanCatalogEntry[]>;
    replace(entries: PlanCatalogEntry[]): Promise<PlanCatalogEntry[]>;
}
