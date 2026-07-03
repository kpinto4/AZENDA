import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { retry, timer } from 'rxjs';
import { formatCop } from '../../../core/format-currency';
import { ApiPlanCatalogService } from '../../../core/services/api-plan-catalog.service';
import { mapPublicPlanCatalogPrices } from '../../../core/services/public-plan-prices.util';
import {
  CHECKOUT_PASARELA_ENABLED,
  CHECKOUT_PAYMENT_METHODS,
  CheckoutPaymentMethodId,
  PLAN_PAYMENT_LINKS,
} from '../checkout.config';
import { CheckoutManualPaymentCardComponent } from '../components/checkout-manual-payment-card.component';
import {
  AZENDA_WHATSAPP_DISPLAY,
  buildRegistrationWhatsAppMessage,
  buildWhatsAppSupportUrl,
} from '../checkout-whatsapp.util';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-payment-step',
  imports: [RouterLink, CheckoutManualPaymentCardComponent],
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">💬</span>
          Activación del plan
        </p>
        <h1>{{ pasarelaEnabled ? 'Elige cómo pagas' : 'Confirma tu registro por WhatsApp' }}</h1>

        <div class="checkout-summary">
          Plan <strong>{{ checkout.selectedPlan() }}</strong>
          @if (priceMonthly() > 0) {
            · referencia {{ formatCop(priceMonthly()) }}/mes
          }
          <br />
          {{ checkout.business() || 'Tu negocio' }} · {{ checkout.email() }}
        </div>

        @if (!pasarelaEnabled) {
          <div class="checkout-pasarela-pending">
            <p>
              El pago en línea estará disponible pronto. Por ahora activamos cada negocio de forma
              <strong>manual</strong>: escríbenos por WhatsApp, confirmamos el valor (puedes pedir
              personalización, por ejemplo más empleados en el plan Básico) y activamos tu panel.
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
        } @else {
          <p class="checkout-note">
            Tu pago activa el plan <strong>{{ checkout.selectedPlan() }}</strong>.
          </p>

          <div class="checkout-pay-list" role="list">
            @for (method of methods; track method.id) {
              <button
                type="button"
                class="checkout-pay-item"
                role="listitem"
                [disabled]="!paymentUrl(method.id)"
                (click)="openPayment(method.id)"
              >
                <div>
                  <strong>{{ method.label }}</strong>
                  @if (method.hint) {
                    <span>{{ method.hint }}</span>
                  }
                </div>
                <span class="checkout-pay-chevron" aria-hidden="true">›</span>
              </button>
            }
          </div>

          <div class="checkout-actions">
            <a routerLink="/contratar/confirmacion" class="az-btn az-btn-secondary">Ya pagué</a>
          </div>
        }
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutPaymentStepComponent implements OnInit {
  readonly checkout = inject(CheckoutSessionService);
  private readonly router = inject(Router);
  private readonly planCatalogApi = inject(ApiPlanCatalogService);

  readonly pasarelaEnabled = CHECKOUT_PASARELA_ENABLED;
  readonly methods = CHECKOUT_PAYMENT_METHODS;
  readonly formatCop = formatCop;
  readonly whatsappDisplay = AZENDA_WHATSAPP_DISPLAY;
  readonly priceMonthly = signal(0);

  readonly plan = computed(() => this.checkout.selectedPlan());

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

  paymentUrl(methodId: CheckoutPaymentMethodId): string | undefined {
    const plan = this.plan();
    if (!plan) {
      return undefined;
    }
    return PLAN_PAYMENT_LINKS[plan]?.[methodId];
  }

  openPayment(methodId: CheckoutPaymentMethodId): void {
    const url = this.paymentUrl(methodId);
    if (!url) {
      return;
    }
    window.open(url, '_blank', 'noopener');
    void this.router.navigateByUrl('/contratar/confirmacion');
  }
}
