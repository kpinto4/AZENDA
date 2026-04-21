import { Module } from '@nestjs/common';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  controllers: [AdminTenantsController, AdminUsersController],
})
export class AdminModule {}
