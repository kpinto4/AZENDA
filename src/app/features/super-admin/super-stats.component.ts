import { Component, computed, inject } from '@angular/core';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-super-stats',
  templateUrl: './super-stats.component.html',
  styleUrl: './super-stats.component.scss',
})
export class SuperStatsComponent {
  readonly data = inject(MockDataService);

  readonly summary = computed(() => {
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
