import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAdminPlatformStatsService, ApiPlatformOverviewDto } from '../../core/services/api-admin-platform-stats.service';
import { formatCop } from '../../core/format-currency';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-super-dashboard',
  imports: [RouterLink],
  templateUrl: './super-dashboard.component.html',
  styleUrl: './super-dashboard.component.scss',
})
export class SuperDashboardComponent {
  readonly data = inject(MockDataService);
  private readonly session = inject(MockSessionService);
  private readonly apiStats = inject(ApiAdminPlatformStatsService);

  readonly apiOverview = signal<ApiPlatformOverviewDto | null>(null);

  readonly useLivePlatformStats = computed(
    () => environment.useLiveAuth && !!this.session.accessToken() && this.session.isSuperAdmin(),
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.useLivePlatformStats()) {
        untracked(() => this.apiOverview.set(null));
        return;
      }
      const sub = this.apiStats.overview().subscribe({
        next: (row) => this.apiOverview.set(row),
        error: () => this.apiOverview.set(null),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  readonly activeTenantCount = computed(() => {
    const row = this.apiOverview();
    if (this.useLivePlatformStats() && row) {
      return row.activeTenantCount;
    }
    return this.data.tenants().filter((t) => t.active).length;
  });

  readonly totalTenantCount = computed(() => {
    const row = this.apiOverview();
    if (this.useLivePlatformStats() && row) {
      return row.tenantCount;
    }
    return this.data.tenants().length;
  });

  readonly mrrKpiFormatted = computed(() => {
    const row = this.apiOverview();
    if (this.useLivePlatformStats() && row) {
      return formatCop(row.estimatedMrrMonthlyCop);
    }
    /** Cifra decorativa en COP (solo demo sin API). */
    return formatCop(2_400_000);
  });
}
