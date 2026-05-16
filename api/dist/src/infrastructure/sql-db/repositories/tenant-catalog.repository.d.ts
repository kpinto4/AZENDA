import { PgClientService } from '../pg-client.service';
import { TenantProductEntity, TenantServiceEntity } from '../sql-db.types';
export declare class TenantCatalogRepository {
    private readonly pg;
    constructor(pg: PgClientService);
    private mapTenantProductRow;
    private mapTenantServiceRow;
    listProductsByTenantId(tenantId: string): Promise<TenantProductEntity[]>;
    createTenantProduct(tenantId: string, data: Omit<TenantProductEntity, 'id' | 'tenantId' | 'catalogOrder'>): Promise<TenantProductEntity>;
    updateTenantProduct(tenantId: string, productId: string, patch: Omit<Partial<TenantProductEntity>, 'id' | 'tenantId' | 'catalogOrder'>): Promise<TenantProductEntity | undefined>;
    deleteTenantProduct(tenantId: string, productId: string): Promise<boolean>;
    moveTenantProduct(tenantId: string, productId: string, direction: -1 | 1): Promise<void>;
    listServicesByTenantId(tenantId: string): Promise<TenantServiceEntity[]>;
    createTenantService(tenantId: string, data: Omit<TenantServiceEntity, 'id' | 'tenantId' | 'catalogOrder'>): Promise<TenantServiceEntity>;
    updateTenantService(tenantId: string, serviceId: string, patch: Omit<Partial<TenantServiceEntity>, 'id' | 'tenantId' | 'catalogOrder'>): Promise<TenantServiceEntity | undefined>;
    deleteTenantService(tenantId: string, serviceId: string): Promise<boolean>;
    moveTenantService(tenantId: string, serviceId: string, direction: -1 | 1): Promise<void>;
}
