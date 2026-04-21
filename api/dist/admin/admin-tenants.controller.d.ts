import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
export declare class AdminTenantsController {
    private readonly sqlDbService;
    constructor(sqlDbService: SqlDbService);
    listTenants(): TenantEntity[];
    getTenantById(tenantId: string): TenantEntity;
    createTenant(body: CreateTenantDto): TenantEntity;
    updateTenant(tenantId: string, body: UpdateTenantDto): TenantEntity;
    deleteTenant(tenantId: string): void;
}
