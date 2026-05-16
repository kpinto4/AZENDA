import { AdminSiteConfigService } from './admin-site-config.service';
import type { PlatformSiteConfig } from '../infrastructure/sql-db/sql-db.types';
import { PatchSiteConfigDto } from './dto/patch-site-config.dto';
export declare class AdminSiteConfigController {
    private readonly adminSiteConfig;
    constructor(adminSiteConfig: AdminSiteConfigService);
    get(): Promise<PlatformSiteConfig>;
    patch(dto: PatchSiteConfigDto): Promise<PlatformSiteConfig>;
}
