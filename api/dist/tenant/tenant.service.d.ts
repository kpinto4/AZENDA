import { AuthUser } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
export declare class TenantService {
    private readonly sqlDbService;
    constructor(sqlDbService: SqlDbService);
    getTenantContext(currentUser: AuthUser): {
        tenant: null;
        message: string;
    } | {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
        message?: undefined;
    };
    updateTenantSettings(currentUser: AuthUser, dto: UpdateTenantSettingsDto): {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
    };
}
