import { Module } from '@nestjs/common';
import { TenantAppointmentsController } from './tenant-appointments.controller';
import { TenantAppointmentsService } from './tenant-appointments.service';
import { TenantStoreVisitsController } from './tenant-store-visits.controller';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantStatusGuard } from '../auth/guards/tenant-status.guard';

@Module({
  controllers: [TenantController, TenantAppointmentsController, TenantStoreVisitsController],
  providers: [TenantService, TenantAppointmentsService, TenantStatusGuard],
})
export class TenantModule {}
