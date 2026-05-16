import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAdminPlatformStatsService, ApiPlatformOverviewDto } from '../../core/services/api-admin-platform-stats.service';
import { MockDataService, TenantModuleKey } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-super-modules',
  imports: [RouterLink],
  templateUrl: './super-modules.component.html',
  styleUrl: './super-modules.component.scss',
})
export class SuperModulesComponent {
  readonly data = inject(MockDataService);
  private readonly session = inject(MockSessionService);
  private readonly apiStats = inject(ApiAdminPlatformStatsService);

  readonly apiOverview = signal<ApiPlatformOverviewDto | null>(null);

  readonly useLivePlatformModules = computed(
    () => environment.useLiveAuth && !!this.session.accessToken() && this.session.isSuperAdmin(),
  );

  readonly liveModuleCards = computed(
    (): { key: TenantModuleKey; name: string; desc: string; tenantsWithModule: number }[] => {
      const row = this.apiOverview();
      if (!row) {
        return [];
      }
      return [
        {
          key: 'citas',
          name: 'Citas',
          desc: 'Agenda, reservas públicas y empleados. Activo/desactivo por tenant en Tenants.',
          tenantsWithModule: row.tenantsWithModuleCitas,
        },
        {
          key: 'ventas',
          name: 'Ventas',
          desc: 'POS e historial. Activo/desactivo por tenant en Tenants.',
          tenantsWithModule: row.tenantsWithModuleVentas,
        },
        {
          key: 'inventario',
          name: 'Inventario',
          desc: 'Stock y catálogo operativo. Activo/desactivo por tenant en Tenants.',
          tenantsWithModule: row.tenantsWithModuleInventario,
        },
      ];
    },
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.useLivePlatformModules()) {
        untracked(() => this.apiOverview.set(null));
        return;
      }
      const sub = this.apiStats.overview().subscribe({
        next: (r) => this.apiOverview.set(r),
        error: () => this.apiOverview.set(null),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
