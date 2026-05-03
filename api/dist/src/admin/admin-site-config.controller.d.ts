import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import type { PlatformSiteConfig } from '../infrastructure/sql-db/sql-db.types';
import { PatchSiteConfigDto } from './dto/patch-site-config.dto';
export declare class AdminSiteConfigController {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
    get(): Promise<PlatformSiteConfig>;
    patch(dto: PatchSiteConfigDto): Promise<PlatformSiteConfig>;
}
