import { PgClientService } from './infrastructure/sql-db/pg-client.service';
export declare class AppService {
    private readonly pg;
    constructor(pg: PgClientService);
    getHello(): string;
    getHealth(): Promise<{
        status: 'ok' | 'degraded';
        checks: {
            database: 'up' | 'down';
        };
        timestamp: string;
    }>;
}
