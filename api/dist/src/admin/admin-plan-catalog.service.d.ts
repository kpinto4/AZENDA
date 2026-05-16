import { PlanCatalogEntry } from '../infrastructure/sql-db/sql-db.types';
import { TenantRepository } from '../infrastructure/sql-db/repositories/tenant.repository';
export declare class AdminPlanCatalogService {
    private readonly tenants;
    constructor(tenants: TenantRepository);
    list(): Promise<PlanCatalogEntry[]>;
    replace(entries: PlanCatalogEntry[]): Promise<PlanCatalogEntry[]>;
}
