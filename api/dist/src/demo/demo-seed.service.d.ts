import { PasswordService } from '../auth/password.service';
import { PgClientService } from '../infrastructure/sql-db/pg-client.service';
export declare class DemoSeedService {
    private readonly pg;
    private readonly passwordService;
    private readonly logger;
    constructor(pg: PgClientService, passwordService: PasswordService);
    ensureDemoTenantSeed(): Promise<void>;
    insertVolatileSample(now?: Date): Promise<void>;
    restoreCoreCatalogFromSnapshot(): Promise<void>;
    private ensureDemoTenantRow;
    private ensureDemoUsers;
    private upsertUser;
    private ensureCoreCatalog;
    private countRows;
}
