import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  CHECKOUT_PASARELA_ENABLED,
  CHECKOUT_PAYMENT_METHODS,
  CheckoutPaymentMethodId,
  PLAN_PAYMENT_LINKS,
} from '../checkout.config';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-payment-step',
  imports: [RouterLink],
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">🔒</span>
          Activación del plan
        </p>
        <h1>{{ pasarelaEnabled ? 'Elige cómo pagas' : 'Tu cuenta está lista' }}</h1>

        <div class="checkout-summary">
          Plan {{ checkout.selectedPlan() }} · {{ checkout.email() }}
        </div>

        @if (!pasarelaEnabled) {
          <div class="checkout-pasarela-pending">
            <p>
              Estamos en trámite de aprobación con la pasarela de pago. Tu registro ya quedó
              guardado; te contactaremos por correo para coordinar el pago y activar tu panel.
            </p>
            <p class="checkout-note">
              No necesitas hacer nada más por ahora. Cuando la pasarela esté lista, podrás pagar
              en línea desde aquí mismo.
            </p>
          </div>

          <div
            class="checkout-pay-list checkout-pay-list--preview"
            role="list"
            aria-label="Métodos de pago próximamente"
          >
            @for (method of methods; track method.id) {
              <div class="checkout-pay-item checkout-pay-item--disabled" role="listitem">
                <div>
                  <strong>{{ method.label }}</strong>
                  @if (method.hint) {
                    <span>{{ method.hint }}</span>
                  }
                  <span class="checkout-soon-badge">Próximamente</span>
                </div>
              </div>
            }
          </div>

          <div class="checkout-actions">
            <a routerLink="/contratar/confirmacion" class="az-btn az-btn-primary full">
              Entendido, continuar
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
export class CheckoutPaymentStepComponent {
  readonly checkout = inject(CheckoutSessionService);
  private readonly router = inject(Router);

  readonly pasarelaEnabled = CHECKOUT_PASARELA_ENABLED;
  readonly methods = CHECKOUT_PAYMENT_METHODS;

  readonly plan = computed(() => this.checkout.selectedPlan());

  paymentUrl(methodId: CheckoutPaymentMethodId): string | undefined {
    const plan = this.plan();
    if (! plan) {
      return undefined;
    }
    return PLAN_PAYMENT_LINKS[ plan]?.[methodId];
  }

  openPayment(methodId: CheckoutPaymentMethodId): void {
    const url = this.paymentUrl(methodId);
    if (!url) {
      return;
    }
    window.open( url, '_blank', 'noopener');
    void this.router.navigateByUrl('/contratar/confirmacion');
  }
}
