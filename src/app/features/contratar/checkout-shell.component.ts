import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

import { CheckoutFooterComponent } from './checkout-footer.component';

@Component({
  selector: 'app-checkout-shell',
  imports: [RouterOutlet, RouterLink, CheckoutFooterComponent],
  template: `
    <div class="checkout-shell">
      <header class="checkout-header">
        <a routerLink="/" class="checkout-brand">Azenda</a>
        @if (showStepper()) {
          <nav class="checkout-stepper" aria-label="Pasos del registro">
            @for (step of steps; track step.id) {
              <span
                class="checkout-step-pill"
                [class.active]="step.id === currentStepId()"
                [class.done]="step.order < currentOrder()"
              >
                {{ step.label }}
              </span>
            }
          </nav>
        }
        <a routerLink="/auth/iniciar-sesion" class="checkout-header-link">Iniciar sesión</a>
      </header>
      <main class="checkout-main">
        <router-outlet />
      </main>
      <app-checkout-footer />
    </div>
  `,
  styleUrl: './checkout-shell.component.scss',
})
export class CheckoutShellComponent {
  private readonly router = inject(Router);

  readonly steps = [
    { id: 'email', label: 'Correo', order: 1 },
    { id: 'plan', label: 'Plan', order: 2 },
    { id: 'account', label: 'Cuenta', order: 3 },
    { id: 'payment', label: 'Pago', order: 4 },
  ] as const;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  readonly currentStepId = computed(() => {
    const path = this.url();
    if (path.includes('/pago') || path.includes('/confirmacion')) {
      return 'payment';
    }
    if (path.includes('/cuenta')) {
      return 'account';
    }
    if (path.includes('/planes')) {
      return 'plan';
    }
    return 'email';
  });

  readonly currentOrder = computed(() => {
    const id = this.currentStepId();
    return this.steps.find((s) => s.id === id)?.order ?? 1;
  });

  readonly showStepper = computed(() => !this.url().includes('/confirmacion'));
}
