import { AdminPlatformStatsService } from './admin-platform-stats.service';
export declare class AdminPlatformStatsController {
    private readonly platformStats;
    constructor(platformStats: AdminPlatformStatsService);
    overview(): Promise<import("../infrastructure/sql-db/repositories/platform-stats.repository").PlatformOverviewStats>;
}
