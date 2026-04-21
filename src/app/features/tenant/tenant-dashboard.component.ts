import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiAppointmentsService, mapApiAppointmentToMock } from '../../core/services/api-appointments.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-tenant-dashboard',
  imports: [RouterLink],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss',
})
export class TenantDashboardComponent {
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiAppointments = inject(ApiAppointmentsService);
  readonly lowStockCount = computed(() => {
    const tid = this.session.tenantId();
    if (!tid) {
      return 0;
    }
    return this.data.productsForTenant(tid).filter((p) => p.lowStock).length;
  });

  readonly myAppointments = computed(() => {
    if (this.apiAppointments.useRemote()) {
      const slug = this.session.publicBookingSlug();
      return this.apiAppointments.rows().map((row) => mapApiAppointmentToMock(row, slug));
    }
    return this.data.appointmentsForBookingSlug(this.session.publicBookingSlug());
  });
}
