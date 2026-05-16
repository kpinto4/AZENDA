import { PlatformOverviewStats, PlatformStatsRepository } from '../infrastructure/sql-db/repositories/platform-stats.repository';
export declare class AdminPlatformStatsService {
    private readonly platformStats;
    constructor(platformStats: PlatformStatsRepository);
    overview(): Promise<PlatformOverviewStats>;
}
