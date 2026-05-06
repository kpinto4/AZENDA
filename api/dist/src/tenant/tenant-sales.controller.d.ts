import { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CreateTenantSaleDto } from './dto/create-tenant-sale.dto';
import { TenantSalesService } from './tenant-sales.service';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class TenantSalesController {
    private readonly tenantSales;
    constructor(tenantSales: TenantSalesService);
    list(req: AuthenticatedRequest): Promise<import("../infrastructure/sql-db/sql-db.types").TenantSaleEntity[]>;
    create(req: AuthenticatedRequest, dto: CreateTenantSaleDto): Promise<import("../infrastructure/sql-db/sql-db.types").TenantSaleEntity>;
}
export {};
