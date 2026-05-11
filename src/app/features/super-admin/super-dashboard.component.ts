import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatCop } from '../../core/format-currency';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-super-dashboard',
  imports: [RouterLink],
  templateUrl: './super-dashboard.component.html',
  styleUrl: './super-dashboard.component.scss',
})
export class SuperDashboardComponent {
  readonly data = inject(MockDataService);
  readonly activeTenantCount = computed(() => this.data.tenants().filter((t) => t.active).length);
  /** Cifra decorativa en COP (demo). */
  readonly mrrDemoCop = formatCop(2_400_000);
}
