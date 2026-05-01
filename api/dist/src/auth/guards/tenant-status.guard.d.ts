import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SqlDbService } from '../../infrastructure/sql-db/sql-db.service';
export declare class TenantStatusGuard implements CanActivate {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
