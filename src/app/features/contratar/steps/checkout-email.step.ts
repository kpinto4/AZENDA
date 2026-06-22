import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-email-step',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="checkout-hero">
      <div class="checkout-hero-inner">
        <h1>Inicia con tu negocio en Azenda</h1>
        <p class="checkout-hero-lead">
          Cancela cuando quieras. Primero elige tu plan y luego creas tu cuenta.
        </p>
        <form [formGroup]="form" (ngSubmit)="continue()">
          <div class="checkout-email-row">
            <input
              type="email"
              formControlName="email"
              placeholder="Correo electrónico"
              autocomplete="email"
              aria-label="Correo electrónico"
            />
            <button type="submit" class="az-btn az-btn-primary" [disabled]="form.invalid">
              Comenzar →
            </button>
          </div>
        </form>
        <p class="checkout-footer-hint">
          ¿Solo quieres explorar?
          <a routerLink="/demo">Probar la demo guiada</a>
        </p>
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutEmailStepComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutSessionService);

  readonly form = this.fb.nonNullable.group({
    email: [this.checkout.email(), [Validators.required, Validators.email]],
  });

  readonly error = signal('');

  continue(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.checkout.setEmail(this.form.controls.email.getRawValue());
    void this.router.navigateByUrl('/contratar/planes');
  }
}
