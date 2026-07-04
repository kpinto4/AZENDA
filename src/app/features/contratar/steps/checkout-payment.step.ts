import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { retry, timer } from 'rxjs';
import { formatCop } from '../../../core/format-currency';
import { ApiPlanCatalogService } from '../../../core/services/api-plan-catalog.service';
import {
  DEFAULT_PUBLIC_PLAN_PRICES,
  mapPublicPlanCatalogPrices,
} from '../../../core/services/public-plan-prices.util';
import {
  CHECKOUT_PASARELA_ENABLED,
  wompiLinkForPlan,
} from '../checkout.config';
import { CheckoutManualPaymentCardComponent } from '../components/checkout-manual-payment-card.component';
import { CheckoutPlanSummaryComponent } from '../components/checkout-plan-summary.component';
import {
  AZENDA_WHATSAPP_DISPLAY,
  buildRegistrationWhatsAppMessage,
  buildWhatsAppSupportUrl,
} from '../checkout-whatsapp.util';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-payment-step',
  imports: [RouterLink, CheckoutManualPaymentCardComponent, CheckoutPlanSummaryComponent],
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">💳</span>
          Activación del plan
        </p>
        <h1>{{ pasarelaEnabled ? 'Paga tu plan' : 'Confirma tu registro por WhatsApp' }}</h1>

        <app-checkout-plan-summary />

        @if (pasarelaEnabled && wompiUrl()) {
          <p class="checkout-note">
            Paga el valor de tu plan con Wompi (tarjeta, Nequi, PSE y otros medios).
            Cuando verifiquemos el pago, activamos tu panel (no es inmediato).
          </p>

          <div class="checkout-actions">
            <a
              class="az-btn az-btn-primary full"
              [href]="wompiUrl()!"
              target="_blank"
              rel="noopener noreferrer"
            >
              @if (priceMonthly() > 0) {
                Pagar {{ formatCop(priceMonthly()) }}/mes con Wompi
              } @else {
                Pagar con Wompi
              }
            </a>
            <a routerLink="/contratar/confirmacion" class="az-btn az-btn-secondary full">
              Ya pagué — continuar
            </a>
          </div>

          <div class="checkout-wa-card">
            <p class="checkout-wa-lead">
              ¿Precio personalizado o dudas? Escríbenos al {{ whatsappDisplay }}.
            </p>
            <a
              class="az-btn checkout-wa-btn full"
              [href]="whatsappUrl()"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp · {{ whatsappDisplay }}
            </a>
          </div>
        } @else {
          <div class="checkout-pasarela-pending">
            <p>
              El pago en línea estará disponible pronto. Por ahora cada negocio queda
              <strong>en espera de confirmación</strong>: escríbenos por WhatsApp, confirmamos el valor y activamos tu
              panel cuando verifiquemos el pago.
            </p>
          </div>

          <app-checkout-manual-payment-card />

          <div class="checkout-wa-card">
            <a
              class="az-btn checkout-wa-btn full"
              [href]="whatsappUrl()"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir WhatsApp · {{ whatsappDisplay }}
            </a>
            <p class="checkout-note checkout-wa-hint">
              Se abrirá un mensaje con tus datos. Envíalo y te confirmamos valor y activación.
            </p>
          </div>

          <div class="checkout-actions">
            <a routerLink="/contratar/confirmacion" class="az-btn az-btn-primary full">
              Ya envié el mensaje — continuar
            </a>
          </div>
        }
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutPaymentStepComponent implements OnInit {
  readonly checkout = inject(CheckoutSessionService);
  private readonly planCatalogApi = inject(ApiPlanCatalogService);

  readonly pasarelaEnabled = CHECKOUT_PASARELA_ENABLED;
  readonly formatCop = formatCop;
  readonly whatsappDisplay = AZENDA_WHATSAPP_DISPLAY;
  readonly priceMonthly = signal(0);

  readonly plan = computed(() => this.checkout.selectedPlan());

  readonly wompiUrl = computed(() => wompiLinkForPlan(this.plan()));

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
    const fallback = DEFAULT_PUBLIC_PLAN_PRICES[plan]?.monthly ?? 0;
    this.priceMonthly.set(fallback);
    this.planCatalogApi
      .getPublic()
      .pipe(retry({ count: 2, delay: () => timer(800) }))
      .subscribe({
        next: (entries) => {
          const map = mapPublicPlanCatalogPrices(entries);
          this.priceMonthly.set(map[plan]?.monthly ?? fallback);
        },
        error: () => this.priceMonthly.set(fallback),
      });
  }

}
