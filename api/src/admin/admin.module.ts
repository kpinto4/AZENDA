import { Module } from '@nestjs/common';
import { AdminPlanCatalogController } from './admin-plan-catalog.controller';
import { AdminSiteConfigController } from './admin-site-config.controller';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  controllers: [
    AdminTenantsController,
    AdminUsersController,
    AdminPlanCatalogController,
    AdminSiteConfigController,
  ],
})
export class AdminModule {}
