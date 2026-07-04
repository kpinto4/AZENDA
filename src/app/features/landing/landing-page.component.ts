import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, retry, take, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DEMO_PUBLIC_BOOKING_SLUG } from '../../core/config/demo.config';
import { formatCop } from '../../core/format-currency';
import {
  ApiSiteConfig,
  ApiSiteConfigService,
  createLandingSiteConfigState,
  LandingSiteConfigState,
  mergeApiSiteConfig,
} from '../../core/services/api-site-config.service';

const CLIENT_RETRY_COUNT = 2;
const CLIENT_RETRY_DELAY_MS = 1200;

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly apiSiteConfig = inject(ApiSiteConfigService);

  private readonly initialState = this.readInitialSiteConfigState();

  readonly siteConfig = signal(this.initialState.config);
  readonly pricesFromApi = signal(this.initialState.pricesFromApi);
  readonly menuOpen = signal(false);

  /** Importes en COP (formato local) para la landing. */
  readonly formatCop = formatCop;
  readonly showDemoBookingExample = environment.showDemoLoginHints;

  constructor() {
    if (!this.pricesFromApi()) {
      this.retryLoadPricesFromApi();
    }

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

  /** Abre la reserva pública del tenant demo (solo en entornos con demo habilitada). */
  openPublicBooking(): void {
    void this.router.navigateByUrl(`/reservar/${DEMO_PUBLIC_BOOKING_SLUG}`);
  }

  private readInitialSiteConfigState(): LandingSiteConfigState {
    const resolved = this.route.snapshot.data['siteConfig'] as LandingSiteConfigState | ApiSiteConfig | undefined;
    if (resolved && typeof resolved === 'object' && 'pricesFromApi' in resolved) {
      return resolved;
    }
    const legacy = resolved as ApiSiteConfig | undefined;
    return createLandingSiteConfigState(legacy, legacy != null);
  }

  /** Si el resolver falló (p. ej. API aún arrancando), reintenta sin mostrar precios de fallback. */
  private retryLoadPricesFromApi(): void {
    this.apiSiteConfig
      .getPublic()
      .pipe(
        retry({
          count: CLIENT_RETRY_COUNT,
          delay: () => timer(CLIENT_RETRY_DELAY_MS),
        }),
        take(1),
        catchError(() => EMPTY),
      )
      .subscribe((config) => {
        this.siteConfig.set(mergeApiSiteConfig(config));
        this.pricesFromApi.set(true);
      });
  }
}
