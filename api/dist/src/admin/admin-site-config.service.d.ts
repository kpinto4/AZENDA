import { PlatformSiteConfigRepository } from '../infrastructure/sql-db/repositories/platform-site-config.repository';
import { PlatformSiteConfig, PlatformSiteLandingCopy } from '../infrastructure/sql-db/sql-db.types';
export declare class AdminSiteConfigService {
    private readonly site;
    constructor(site: PlatformSiteConfigRepository);
    get(): Promise<PlatformSiteConfig>;
    patch(dto: Partial<PlatformSiteConfig> & {
        landing?: Partial<PlatformSiteLandingCopy>;
    }): Promise<PlatformSiteConfig>;
}
