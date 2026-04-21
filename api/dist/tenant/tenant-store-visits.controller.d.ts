import { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class TenantStoreVisitsController {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
    list(req: AuthenticatedRequest): import("../infrastructure/sql-db/sql-db.types").StoreVisitLogEntity[];
}
export {};
