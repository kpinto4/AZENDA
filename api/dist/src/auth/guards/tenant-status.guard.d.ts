import { CanActivate, ExecutionContext } from '@nestjs/common';
import { TenantRepository } from '../../infrastructure/sql-db/repositories/tenant.repository';
export declare class TenantStatusGuard implements CanActivate {
    private readonly tenants;
    constructor(tenants: TenantRepository);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
