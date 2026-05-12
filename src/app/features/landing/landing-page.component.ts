import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatCop } from '../../core/format-currency';
import {
  ApiSiteConfigService,
  DEFAULT_API_SITE_CONFIG,
  mergeApiSiteConfig,
} from '../../core/services/api-site-config.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly router = inject(Router);
  private readonly siteApi = inject(ApiSiteConfigService);

  readonly siteConfig = signal(mergeApiSiteConfig(DEFAULT_API_SITE_CONFIG));

  /** Importes en COP (formato local) para la landing. */
  readonly formatCop = formatCop;

  constructor() {
    this.siteApi.getPublic().subscribe({
      next: (c) => this.siteConfig.set(mergeApiSiteConfig(c)),
      error: () => {
        /* se mantiene DEFAULT_API_SITE_CONFIG */
      },
    });
  }

  /** Abre la reserva pública de ejemplo para mostrar el flujo al visitante. */
  openPublicBooking(): void {
    void this.router.navigateByUrl('/reservar/barberia-centro');
  }
}
