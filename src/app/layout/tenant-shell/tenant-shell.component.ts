import { NgStyle } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAppointmentsService } from '../../core/services/api-appointments.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-tenant-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgStyle],
  templateUrl: './tenant-shell.component.html',
  styleUrl: './tenant-shell.component.scss',
})
export class TenantShellComponent {
  readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);
  private readonly router = inject(Router);
  private readonly apiAppointments = inject(ApiAppointmentsService);
  private readonly destroyRef = inject(DestroyRef);

  /** En móvil el menú se abre como panel lateral; en escritorio no aplica. */
  readonly menuOpen = signal(false);

  readonly currentTenant = computed(() => {
    const id = this.session.tenantId();
    if (!id) {
      return undefined;
    }
    return this.data.tenants().find((t) => t.id === id);
  });
  readonly tenantBranding = computed(() => {
    const id = this.session.tenantId();
    if (!id) {
      return this.data.brandingForBookingSlug('azenda');
    }
    return this.data.brandingForTenant(id);
  });
  readonly shellStyleVars = computed(() =>
    this.data.brandingCssVars(this.tenantBranding(), this.session.darkMode()),
  );
  readonly tenantRestrictionMessage = computed(() => this.session.tenantRestrictionMessage());

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (window.innerWidth > 860) {
          this.menuOpen.set(false);
        }
      });
    }

    effect(() => {
      if (typeof document === 'undefined') {
        return;
      }
      const open = this.menuOpen();
      const narrow = typeof window !== 'undefined' && window.innerWidth <= 860;
      document.body.style.overflow = open && narrow ? 'hidden' : '';
    });

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
    effect((onCleanup) => {
      if (!(environment.useLiveAuth && this.session.accessToken() && this.session.isTenantUser())) {
        return;
      }
      const tick = () => {
        untracked(() => this.apiAppointments.refresh().subscribe({ error: () => {} }));
      };
      // Polling liviano para reflejar nuevas reservas públicas sin recargar panel.
      const timer = setInterval(tick, 8000);
      onCleanup(() => clearInterval(timer));
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
          this.apiAppointments.refresh().subscribe({ error: () => {} });
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
    this.menuOpen.set(false);
    this.session.logout();
    void this.router.navigateByUrl('/');
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onSidebarPointerDown(ev: Event): void {
    const el = ev.target as HTMLElement | null;
    if (el?.closest('a')) {
      this.closeMenu();
    }
  }
}
