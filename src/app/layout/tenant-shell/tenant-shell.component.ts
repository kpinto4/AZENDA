import { Component, computed, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAppointmentsService } from '../../core/services/api-appointments.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-tenant-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './tenant-shell.component.html',
  styleUrl: './tenant-shell.component.scss',
})
export class TenantShellComponent {
  readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);
  private readonly router = inject(Router);
  private readonly apiAppointments = inject(ApiAppointmentsService);

  readonly currentTenant = computed(() => {
    const id = this.session.tenantId();
    if (!id) {
      return undefined;
    }
    return this.data.tenants().find((t) => t.id === id);
  });

  constructor() {
    effect((onCleanup) => {
      if (environment.useLiveAuth && this.session.accessToken() && this.session.isTenantUser()) {
        const sub = untracked(() =>
          this.session.refreshTenantModulesFromApi().subscribe({
            error: () => {},
          }),
        );
        onCleanup(() => sub.unsubscribe());
      }
    });
    effect(() => {
      if (environment.useLiveAuth && this.session.accessToken() && this.session.isTenantUser()) {
        this.apiAppointments.refresh().subscribe({ error: () => this.apiAppointments.clear() });
      } else {
        this.apiAppointments.clear();
      }
    });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (
          document.visibilityState === 'visible' &&
          environment.useLiveAuth &&
          this.session.accessToken() &&
          this.session.isTenantUser()
        ) {
          this.session.refreshTenantModulesFromApi().subscribe({ error: () => {} });
        }
      });
    }
    effect(() => {
      if (this.session.accessToken()) {
        return;
      }
      const id = this.session.tenantId();
      const tenants = this.data.tenants();
      if (!id) {
        return;
      }
      const t = tenants.find((x) => x.id === id);
      if (t) {
        this.session.syncFromTenant(t);
      }
    });
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/');
  }
}
