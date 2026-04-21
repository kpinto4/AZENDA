import { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { TenantService } from './tenant.service';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    getTenantContext(req: AuthenticatedRequest): {
        tenant: null;
        message: string;
    } | {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
        message?: undefined;
    };
}
export {};
