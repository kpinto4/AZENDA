import { OnModuleDestroy } from '@nestjs/common';
export declare class PgClientService implements OnModuleDestroy {
    private readonly logger;
    private readonly pool;
    constructor();
    onModuleDestroy(): Promise<void>;
    private toPgSql;
    queryRows(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
    queryOne(sql: string, params?: unknown[]): Promise<Record<string, unknown> | undefined>;
    exec(sql: string, params?: unknown[]): Promise<void>;
    execScript(sql: string): Promise<void>;
    ensureIndex(createSql: string): Promise<void>;
}
