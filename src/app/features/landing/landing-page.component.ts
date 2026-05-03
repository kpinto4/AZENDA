import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ApiSiteConfigService,
  DEFAULT_API_SITE_CONFIG,
  mergeApiSiteConfig,
} from '../../core/services/api-site-config.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly router = inject(Router);
  private readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);
  private readonly siteApi = inject(ApiSiteConfigService);

  readonly siteConfig = signal(mergeApiSiteConfig(DEFAULT_API_SITE_CONFIG));

  /** Formato de importes para la landing (p. ej. pesos colombianos). */
  formatMoney(n: number): string {
    const v = Number(n);
    if (Number.isNaN(v)) {
      return '—';
    }
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(v);
  }

  constructor() {
    this.siteApi.getPublic().subscribe({
      next: (c) => this.siteConfig.set(mergeApiSiteConfig(c)),
      error: () => {
        /* se mantiene DEFAULT_API_SITE_CONFIG */
      },
    });
  }

  enterSuperDemo(): void {
    this.session.loginAsSuperAdmin();
    void this.router.navigateByUrl('/super/panel');
  }

  enterTenantDemo(): void {
    const t = this.data.tenantById('t1');
    if (t) {
      this.session.loginFromTenant(t, { userName: 'María López', role: 'TENANT_ADMIN' });
    } else {
      this.session.loginAsTenantAdmin();
    }
    void this.router.navigateByUrl('/app');
  }

  openBookingDemo(): void {
    void this.router.navigateByUrl('/reservar/barberia-centro');
  }

  resetDemo(): void {
    this.session.logout();
    this.data.resetDemo();
  }
}
