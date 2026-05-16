import { PgClientService } from '../pg-client.service';
import { TenantBrandingEntity } from '../sql-db.types';
import { TenantRepository } from './tenant.repository';
export declare class TenantBrandingRepository {
    private readonly pg;
    private readonly tenants;
    constructor(pg: PgClientService, tenants: TenantRepository);
    get(tenantId: string): Promise<TenantBrandingEntity>;
    update(tenantId: string, patch: Partial<Omit<TenantBrandingEntity, 'tenantId'>>): Promise<TenantBrandingEntity>;
}
