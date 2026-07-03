import { Component } from '@angular/core';
import { CHECKOUT_MANUAL_PAYMENT } from '../checkout.config';

@Component({
  selector: 'app-checkout-manual-payment-card',
  template: `
    <div class="checkout-manual-pay" role="region" aria-label="Medios de pago">
      <h2 class="checkout-manual-pay-title">Cómo pagar</h2>
      <ul class="checkout-manual-pay-list">
        @for (method of manualPayment.methods; track method.id) {
          <li class="checkout-manual-pay-item">
            <span class="checkout-manual-pay-label">{{ method.label }}</span>
            <strong class="checkout-manual-pay-value">{{ method.accountDisplay }}</strong>
            <span class="checkout-manual-pay-holder">Titular: {{ method.holder }}</span>
            @if (method.note) {
              <span class="checkout-manual-pay-note">{{ method.note }}</span>
            }
          </li>
        }
      </ul>
      <p class="checkout-manual-pay-foot">{{ manualPayment.afterPayNote }}</p>
    </div>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutManualPaymentCardComponent {
  readonly manualPayment = CHECKOUT_MANUAL_PAYMENT;
}
