import { PgClientService } from '../infrastructure/sql-db/pg-client.service';
import { DemoSeedService } from './demo-seed.service';
export interface DemoResetResult {
    tenantId: string;
    appointmentsDeleted: number;
    salesDeleted: number;
    visitsDeleted: number;
    stockMovementsDeleted: number;
    nonCoreServicesDeleted: number;
    nonCoreProductsDeleted: number;
    coreServicesPreserved: number;
    coreProductsPreserved: number;
    volatileReinserted: boolean;
}
export declare class DemoResetService {
    private readonly pg;
    private readonly demoSeed;
    private readonly logger;
    constructor(pg: PgClientService, demoSeed: DemoSeedService);
    resetDemoTenantPartial(): Promise<DemoResetResult>;
    private countThenDelete;
    private countCore;
}
