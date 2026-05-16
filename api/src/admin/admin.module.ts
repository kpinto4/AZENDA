import { Module } from '@nestjs/common';
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
  ],
  providers: [AdminTenantsService, AdminUsersService, AdminPlanCatalogService, AdminSiteConfigService],
})
export class AdminModule {}
