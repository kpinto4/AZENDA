import { Injectable } from '@nestjs/common';
import {
  PlatformOverviewStats,
  PlatformStatsRepository,
} from '../infrastructure/sql-db/repositories/platform-stats.repository';

@Injectable()
export class AdminPlatformStatsService {
  constructor(private readonly platformStats: PlatformStatsRepository) {}

  overview(): Promise<PlatformOverviewStats> {
    return this.platformStats.loadOverview();
  }
}
