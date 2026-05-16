import { Module } from '@nestjs/common';
import { AdminPlatformStatsController } from './admin-platform-stats.controller';
import { AdminPlatformStatsService } from './admin-platform-stats.service';
import { AdminPlanCatalogController } from './admin-plan-catalog.controller';
import { AdminPlanCatalogService } from './admin-plan-catalog.service';
import { AdminSiteConfigController } from './admin-site-config.controller';
import { AdminSiteConfigService } from './admin-site-config.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminTenantsService } from './admin-tenants.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  controllers: [
    AdminTenantsController,
    AdminUsersController,
    AdminPlanCatalogController,
    AdminSiteConfigController,
    AdminPlatformStatsController,
  ],
  providers: [
    AdminTenantsService,
    AdminUsersService,
    AdminPlanCatalogService,
    AdminSiteConfigService,
    AdminPlatformStatsService,
  ],
})
export class AdminModule {}
