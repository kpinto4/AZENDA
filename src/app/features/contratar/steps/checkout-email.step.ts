import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-email-step',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="checkout-hero">
      <div class="checkout-hero-inner">
        <h1>Inicia con tu negocio en Azenda</h1>
        <p class="checkout-hero-lead">
          Elige tu plan, crea tu cuenta y coordina el pago. Activamos tu panel tras confirmar el pago
          (suele tomar pocas horas hábiles).
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
export class CheckoutEmailStepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly checkout = inject(CheckoutSessionService);

  readonly form = this.fb.nonNullable.group({
    email: [this.checkout.email(), [Validators.required, Validators.email]],
  });

  readonly error = signal('');

  ngOnInit(): void {
    this.checkout.applyPlanFromQuery(this.route.snapshot.queryParamMap.get('plan'));
  }

  continue(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.checkout.setEmail(this.form.controls.email.getRawValue());
    const target = this.checkout.hasPlan() ? '/contratar/cuenta' : '/contratar/planes';
    void this.router.navigateByUrl(target);
  }
}
