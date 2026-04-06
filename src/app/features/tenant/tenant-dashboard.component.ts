import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  readonly lowStockCount = computed(() => this.data.products().filter((p) => p.lowStock).length);
}
