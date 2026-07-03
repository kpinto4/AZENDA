import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ApiAuthService } from '../../../core/services/api-auth.service';
import { MockSessionService } from '../../../core/services/mock-session.service';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-account-step',
  imports: [ReactiveFormsModule],
  template: `
    <section class="checkout-panel">
      <div class="checkout-panel-inner">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">✓</span>
          Paso <strong>3</strong> de <strong>3</strong> · Cuenta
        </p>
        <h1>Crea tu cuenta</h1>
        <div class="checkout-summary">
          Plan <strong>{{ checkout.selectedPlan() }}</strong> ·
          {{ checkout.email() }}
        </div>

        <form class="checkout-form" [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Nombre del negocio
            <input type="text" formControlName="business" autocomplete="organization" />
          </label>
          <label>
            Correo
            <input type="email" formControlName="email" readonly />
          </label>
          <label>
            Contraseña
            <input
              [type]="passwordVisible() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password"
            />
          </label>
          @if (message()) {
            <p class="checkout-error" role="alert">{{ message() }}</p>
          }
          <div class="checkout-actions">
            <button type="submit" class="az-btn az-btn-primary full" [disabled]="saving()">
              {{ saving() ? 'Creando cuenta…' : 'Crear cuenta y continuar' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutAccountStepComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly apiAuth = inject(ApiAuthService);
  private readonly session = inject(MockSessionService);
  readonly checkout = inject(CheckoutSessionService);

  readonly passwordVisible = signal(false);
  readonly saving = signal(false);
  readonly message = signal('');

  readonly form = this.fb.nonNullable.group({
    business: [this.checkout.business(), Validators.required],
    email: [{ value: this.checkout.email(), disabled: true }, Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const business = this.form.controls.business.getRawValue().trim();
    const password = this.form.controls.password.getRawValue();
    const email = this.checkout.email();
    const plan = this.checkout.selectedPlan();
    if (!plan) {
      void this.router.navigateByUrl('/contratar/planes/elegir');
      return;
    }

    this.checkout.setBusiness(business);
    this.message.set('');
    this.saving.set(true);

    if (!environment.useLiveAuth) {
      this.checkout.markAccountCreated();
      this.saving.set(false);
      void this.router.navigateByUrl('/contratar/pago');
      return;
    }

    this.apiAuth
      .register(business, email, password, {
        selectedPlan: plan,
        billingCycle: this.checkout.billingCycle(),
      })
      .subscribe({
        next: (res) => {
          this.session.applyLiveLoginResponse(res).subscribe({
            next: () => {
              this.session.persistAuthIfRequested(res.accessToken, true);
              this.checkout.markAccountCreated();
              this.saving.set(false);
              void this.router.navigateByUrl('/contratar/pago');
            },
            error: () => {
              this.saving.set(false);
              this.message.set(
                'Cuenta creada pero no se pudo iniciar sesión. Entra manualmente y continúa el pago.',
              );
            },
          });
        },
        error: (err: unknown) => {
          this.saving.set(false);
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.message.set('Ya existe una cuenta con ese correo. Inicia sesión.');
            return;
          }
          if (err instanceof HttpErrorResponse && err.status === 0) {
            this.message.set('El API no responde. Espera unos segundos e inténtalo de nuevo.');
            return;
          }
          this.message.set('No se pudo crear la cuenta. Revisa los datos.');
        },
      });
  }
}
