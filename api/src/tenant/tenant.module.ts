import { Module } from '@nestjs/common';
import { TenantAppointmentsController } from './tenant-appointments.controller';
import { TenantAppointmentsService } from './tenant-appointments.service';
import { TenantStoreVisitsController } from './tenant-store-visits.controller';
import { TenantSalesController } from './tenant-sales.controller';
import { TenantSalesService } from './tenant-sales.service';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantStatusGuard } from '../auth/guards/tenant-status.guard';

@Module({
  controllers: [
    TenantController,
    TenantAppointmentsController,
    TenantStoreVisitsController,
    TenantSalesController,
  ],
  providers: [TenantService, TenantAppointmentsService, TenantSalesService, TenantStatusGuard],
})
export class TenantModule {}
