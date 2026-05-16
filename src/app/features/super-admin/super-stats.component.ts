import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ApiAdminPlatformStatsService, ApiPlatformOverviewDto } from '../../core/services/api-admin-platform-stats.service';
import { formatCop } from '../../core/format-currency';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-super-stats',
  templateUrl: './super-stats.component.html',
  styleUrl: './super-stats.component.scss',
})
export class SuperStatsComponent {
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

  readonly summary = computed(() => {
    const live = this.useLivePlatformStats();
    const row = live ? this.apiOverview() : null;
    if (live && row) {
      return {
        tenants: row.tenantCount,
        active: row.activeTenantCount,
        appt: row.appointmentCount,
        salesCount: row.salesCount,
        salesSum: row.salesTotalCop,
        employees: row.tenantPanelUserCount,
        movements: row.stockMovementsCount,
      };
    }
    const tenants = this.data.tenants();
    const sales = this.data.sales();
    return {
      tenants: tenants.length,
      active: tenants.filter((t) => t.active).length,
      appt: this.data.appointments().length,
      salesCount: sales.length,
      salesSum: sales.reduce((a, s) => a + s.total, 0),
      employees: this.data.employees().length,
      movements: this.data.stockMovements().length,
    };
  });

  readonly salesSumFormatted = computed(() => formatCop(this.summary().salesSum));

  /** Barras relativas para el gráfico decorativo (0–100). */
  readonly barHeights = computed(() => {
    const s = this.summary();
    const max = Math.max(s.tenants * 20, s.appt * 8, s.salesSum, s.salesCount * 10, 1);
    return [
      Math.round((s.tenants * 25 * 100) / max),
      Math.round((s.active * 30 * 100) / max),
      Math.round((s.appt * 12 * 100) / max),
      Math.round((s.salesCount * 15 * 100) / max),
      Math.min(100, Math.round((s.salesSum * 100) / max)),
      Math.round((s.movements * 20 * 100) / max),
    ].map((n) => Math.min(100, Math.max(12, n)));
  });
}
