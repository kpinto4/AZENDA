import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { retry, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiPlanCatalogService } from '../../../core/services/api-plan-catalog.service';
import { mapPublicPlanCatalogPrices } from '../../../core/services/public-plan-prices.util';
import { CheckoutPlanSummaryComponent } from '../components/checkout-plan-summary.component';
import {
  AZENDA_WHATSAPP_DISPLAY,
  buildRegistrationWhatsAppMessage,
  buildWhatsAppSupportUrl,
} from '../checkout-whatsapp.util';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-confirmation-step',
  imports: [RouterLink, CheckoutPlanSummaryComponent],
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">✓</span>
          Solicitud recibida
        </p>
        <h1>Solicitud en espera de confirmación</h1>

        <app-checkout-plan-summary />

        <ul class="checkout-bullets">
          <li>
            Si ya pagaste con <strong>Wompi</strong>, avísanos por WhatsApp al
            <strong>{{ whatsappDisplay }}</strong> (puedes usar el botón de abajo).
          </li>
          <li>
            Tu cuenta queda <strong>en espera de confirmación</strong> hasta que verifiquemos el pago y activemos el
            panel (no es inmediato).
          </li>
          <li>
            Cuando esté activo, entra con tu correo y contraseña en <strong>Iniciar sesión</strong>.
          </li>
        </ul>

        <div class="checkout-wa-card">
          <p class="checkout-wa-lead">
            Mensaje listo con tu plan y datos. Envíalo para que confirmemos el pago.
          </p>
          <a
            class="az-btn checkout-wa-btn full"
            [href]="whatsappUrl()"
            target="_blank"
            rel="noopener noreferrer"
          >
            Confirmar por WhatsApp · {{ whatsappDisplay }}
          </a>
        </div>

        <div class="checkout-actions">
          <a routerLink="/" class="az-btn az-btn-secondary">Volver al inicio</a>
          @if (showDemoLink) {
            <a routerLink="/demo" class="az-btn az-btn-primary">Mientras tanto, explora la demo</a>
          } @else {
            <a routerLink="/auth/iniciar-sesion" class="az-btn az-btn-primary">Ir a iniciar sesión</a>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutConfirmationStepComponent implements OnInit {
  readonly checkout = inject(CheckoutSessionService);
  private readonly planCatalogApi = inject(ApiPlanCatalogService);

  readonly whatsappDisplay = AZENDA_WHATSAPP_DISPLAY;
  readonly showDemoLink = environment.showDemoLoginHints;
  readonly priceMonthly = signal(0);

  readonly whatsappUrl = computed(() =>
    buildWhatsAppSupportUrl(
      buildRegistrationWhatsAppMessage({
        business: this.checkout.business() || 'Mi negocio',
        email: this.checkout.email(),
        plan: this.checkout.selectedPlan() ?? '—',
        priceMonthly: this.priceMonthly() || undefined,
      }),
    ),
  );

  ngOnInit(): void {
    const plan = this.checkout.selectedPlan();
    if (!plan) {
      return;
    }
    this.planCatalogApi
      .getPublic()
      .pipe(retry({ count: 2, delay: () => timer(800) }))
      .subscribe({
        next: (entries) => {
          const map = mapPublicPlanCatalogPrices(entries);
          this.priceMonthly.set(map[plan].monthly);
        },
        error: () => this.priceMonthly.set(0),
      });
  }
}
