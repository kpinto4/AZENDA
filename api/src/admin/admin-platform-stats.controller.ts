import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminPlatformStatsService } from './admin-platform-stats.service';

@Controller('admin/platform-stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminPlatformStatsController {
  constructor(private readonly platformStats: AdminPlatformStatsService) {}

  @Get()
  overview() {
    return this.platformStats.overview();
  }
}
