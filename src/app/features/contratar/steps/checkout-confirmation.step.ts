import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-confirmation-step',
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">✓</span>
          Solicitud recibida
        </p>
        <h1>Estamos activando tu cuenta</h1>
        <ul class="checkout-bullets">
          <li>
            Recibimos tu registro para el plan <strong>{{ checkout.selectedPlan() }}</strong>
            ({{ checkout.email() }}).
          </li>
          <li>
            Te escribiremos a <strong>{{ checkout.email() }}</strong> para coordinar el pago y activar tu panel.
          </li>
          <li>
            Mientras tanto puedes explorar la demo con todas las funciones del producto.
          </li>
        </ul>
        <div class="checkout-actions">
          <a routerLink="/" class="az-btn az-btn-secondary">Volver al inicio</a>
          <a routerLink="/demo" class="az-btn az-btn-primary">Mientras tanto, explora la demo</a>
        </div>
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutConfirmationStepComponent {
  readonly checkout = inject(CheckoutSessionService);
}
