import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiBaseUrl } from '../../core/config/api-base-url';
import { DEFAULT_API_SITE_CONFIG } from '../../core/services/api-site-config.service';

@Component({
  selector: 'app-checkout-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="checkout-footer">
      <div class="az-container checkout-footer-inner">
        <div class="checkout-footer-brand">
          <span class="checkout-footer-logo">{{ brand }}</span>
          <span class="checkout-footer-note">{{ footerNote }}</span>
        </div>
        <nav class="checkout-footer-links" aria-label="Enlaces de pie">
          <a routerLink="/">Inicio</a>
          <a routerLink="/demo">Explorar demo</a>
          <a routerLink="/" fragment="planes">Planes</a>
          <a routerLink="/auth/iniciar-sesion">Iniciar sesión</a>
        </nav>
      </div>
    </footer>
  `,
  styles: `
    .checkout-footer {
      margin-top: auto;
      padding: 2rem 0 1.75rem;
      border-top: 1px solid var(--az-border);
      background: color-mix(in srgb, var(--az-bg) 92%, var(--az-surface));
      font-size: 0.86rem;
      color: var(--az-muted);
    }

    .checkout-footer-inner {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    @media (min-width: 720px) {
      .checkout-footer-inner {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-end;
      }
    }

    .checkout-footer-brand {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .checkout-footer-logo {
      font-weight: 800;
      font-size: 1.05rem;
      color: var(--az-text);
    }

    .checkout-footer-note {
      max-width: 24rem;
      line-height: 1.5;
    }

    .checkout-footer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem 1.1rem;
    }

    .checkout-footer-links a {
      color: var(--az-muted);
      font-weight: 600;
      text-decoration: none;
    }

    .checkout-footer-links a:hover {
      color: var(--az-primary);
    }
  `,
})
export class CheckoutFooterComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  brand = DEFAULT_API_SITE_CONFIG.landing.navBrand;
  footerNote = DEFAULT_API_SITE_CONFIG.landing.footerNote;

  ngOnInit(): void {
    this.http
      .get<{ landing?: { navBrand?: string; footerNote?: string } }>(
        `${apiBaseUrl()}/public/site-config`,
      )
      .subscribe({
        next: (cfg) => {
          if (cfg.landing?.navBrand?.trim()) {
            this.brand = cfg.landing.navBrand.trim();
          }
          if (cfg.landing?.footerNote?.trim()) {
            this.footerNote = cfg.landing.footerNote.trim();
          }
          this.cdr.markForCheck();
        },
        error: () => {},
      });
  }
}
