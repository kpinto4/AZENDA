import { Module } from '@nestjs/common';
import { TenantAppointmentsController } from './tenant-appointments.controller';
import { TenantAppointmentsService } from './tenant-appointments.service';
import { TenantStoreVisitsController } from './tenant-store-visits.controller';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

@Module({
  controllers: [TenantController, TenantAppointmentsController, TenantStoreVisitsController],
  providers: [TenantService, TenantAppointmentsService],
})
export class TenantModule {}
