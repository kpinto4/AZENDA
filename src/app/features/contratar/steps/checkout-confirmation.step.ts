import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { retry, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { formatCop } from '../../../core/format-currency';
import { ApiPlanCatalogService } from '../../../core/services/api-plan-catalog.service';
import { mapPublicPlanCatalogPrices } from '../../../core/services/public-plan-prices.util';
import { CHECKOUT_PASARELA_ENABLED } from '../checkout.config';
import { CheckoutManualPaymentCardComponent } from '../components/checkout-manual-payment-card.component';
import {
  AZENDA_WHATSAPP_DISPLAY,
  buildRegistrationWhatsAppMessage,
  buildWhatsAppSupportUrl,
} from '../checkout-whatsapp.util';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-confirmation-step',
  imports: [RouterLink, CheckoutManualPaymentCardComponent],
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">✓</span>
          Solicitud recibida
        </p>
        <h1>Un paso más: confirma por WhatsApp</h1>
        <ul class="checkout-bullets">
          <li>
            Registro para el plan <strong>{{ checkout.selectedPlan() }}</strong>
            @if (priceMonthly() > 0) {
              (referencia <strong>{{ formatCop(priceMonthly()) }}/mes</strong>)
            }
            · {{ checkout.email() }}.
          </li>
          <li>
            Tu cuenta está <strong>en espera de confirmación</strong>. Escríbenos al
            <strong>{{ whatsappDisplay }}</strong> para confirmar el valor, coordinar el pago o pedir personalización.
          </li>
          <li>
            Cuando verifiquemos el pago, activamos tu panel y podrás entrar con tu correo y contraseña en
            <strong>Iniciar sesión</strong>.
          </li>
        </ul>

        <app-checkout-manual-payment-card />

        <div class="checkout-wa-card">
          <p class="checkout-wa-lead">
            Toca el botón para abrir WhatsApp con un mensaje listo. Solo envíalo y te respondemos pronto.
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

  readonly formatCop = formatCop;
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
    if (!plan || CHECKOUT_PASARELA_ENABLED) {
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
