import { AuthUser } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { CreateTenantSaleDto } from './dto/create-tenant-sale.dto';
export declare class TenantSalesService {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
    private assertTenantSalesModule;
    list(user: AuthUser): Promise<import("../infrastructure/sql-db/sql-db.types").TenantSaleEntity[]>;
    create(user: AuthUser, dto: CreateTenantSaleDto): Promise<import("../infrastructure/sql-db/sql-db.types").TenantSaleEntity>;
    private normalizeSaleDate;
}
