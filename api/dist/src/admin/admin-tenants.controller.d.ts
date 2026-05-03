import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { AdminUpgradeQuoteDto } from './dto/admin-upgrade-quote.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
export declare class AdminTenantsController {
    private readonly sqlDbService;
    constructor(sqlDbService: SqlDbService);
    listTenants(): Promise<TenantEntity[]>;
    getTenantById(tenantId: string): Promise<TenantEntity>;
    upgradeQuote(tenantId: string, body: AdminUpgradeQuoteDto): Promise<{
        tenantId: string;
        currentPlan: string;
        targetPlan: string;
        currentCycle: import("../infrastructure/sql-db/sql-db.types").BillingCycle;
        targetCycle: import("../infrastructure/sql-db/sql-db.types").BillingCycle;
        period: {
            start: string;
            end: string;
            totalDays: number;
            remainingDays: number;
        };
        creditAmount: number;
        targetCostForRemaining: number;
        amountDueNow: number;
        carryOverBalance: number;
    }>;
    createTenant(body: CreateTenantDto): Promise<TenantEntity>;
    updateTenant(tenantId: string, body: UpdateTenantDto): Promise<TenantEntity>;
    deleteTenant(tenantId: string): Promise<void>;
}
