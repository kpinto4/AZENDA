import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatCop } from '../../core/format-currency';
import {
  ApiSiteConfig,
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
  private readonly route = inject(ActivatedRoute);

  readonly siteConfig = signal(this.readInitialSiteConfig());
  readonly menuOpen = signal(false);

  /** Importes en COP (formato local) para la landing. */
  readonly formatCop = formatCop;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
          this.menuOpen.set(false);
        }
      });
    }

    effect((onCleanup) => {
      if (typeof document === 'undefined') {
        return;
      }
      const open = this.menuOpen();
      const narrow = typeof window !== 'undefined' && window.innerWidth <= 768;
      document.body.style.overflow = open && narrow ? 'hidden' : '';
      onCleanup(() => {
        document.body.style.overflow = '';
      });
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onNavClick(event: Event): void {
    const el = event.target as HTMLElement | null;
    if (el?.closest('a')) {
      this.closeMenu();
    }
  }

  /** Abre la reserva pública de ejemplo para mostrar el flujo al visitante. */
  openPublicBooking(): void {
    void this.router.navigateByUrl('/reservar/barberia-centro');
  }

  private readInitialSiteConfig(): ApiSiteConfig {
    const resolved = this.route.snapshot.data['siteConfig'] as ApiSiteConfig | undefined;
    return mergeApiSiteConfig(resolved ?? DEFAULT_API_SITE_CONFIG);
  }
}
