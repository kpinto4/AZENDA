import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkout-plan-intro-step',
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">✓</span>
          Paso <strong>1</strong> de <strong>3</strong> · Plan
        </p>
        <h1>Elige tu plan</h1>
        <ul class="checkout-bullets">
          <li>Sin compromisos: cancela cuando quieras.</li>
          <li>Todos los módulos según el plan que elijas.</li>
          <li>Reservas en línea para tus clientes desde el primer día.</li>
        </ul>
        <div class="checkout-actions">
          <button type="button" class="az-btn az-btn-primary full" (click)="next()">
            Siguiente
          </button>
        </div>
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutPlanIntroStepComponent {
  private readonly router = inject(Router);

  next(): void {
    void this.router.navigateByUrl('/contratar/planes/elegir');
  }
}
