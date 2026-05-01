import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
export declare class AdminTenantsController {
    private readonly sqlDbService;
    constructor(sqlDbService: SqlDbService);
    listTenants(): Promise<TenantEntity[]>;
    getTenantById(tenantId: string): Promise<TenantEntity>;
    createTenant(body: CreateTenantDto): Promise<TenantEntity>;
    updateTenant(tenantId: string, body: UpdateTenantDto): Promise<TenantEntity>;
    deleteTenant(tenantId: string): Promise<void>;
}
