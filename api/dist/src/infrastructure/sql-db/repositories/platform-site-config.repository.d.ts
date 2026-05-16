import { PgClientService } from '../pg-client.service';
import { PlatformSiteConfig, PlatformSiteLandingCopy } from '../sql-db.types';
export declare class PlatformSiteConfigRepository {
    private readonly pg;
    constructor(pg: PgClientService);
    private round2;
    merge(base: PlatformSiteConfig, patch: Partial<PlatformSiteConfig> & {
        landing?: Partial<PlatformSiteLandingCopy>;
    }): PlatformSiteConfig;
    ensureTableAndDefaultRow(): Promise<void>;
    get(): Promise<PlatformSiteConfig>;
    patch(patch: Partial<PlatformSiteConfig> & {
        landing?: Partial<PlatformSiteLandingCopy>;
    }): Promise<PlatformSiteConfig>;
}
