import { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
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
    updateSettings(req: AuthenticatedRequest, dto: UpdateTenantSettingsDto): {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
    };
}
export {};
