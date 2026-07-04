import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAuthService } from '../../core/services/api-auth.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent {
  protected readonly environment = environment;
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly data = inject(MockDataService);
  private readonly session = inject(MockSessionService);
  private readonly apiAuth = inject(ApiAuthService);

  readonly form = this.fb.nonNullable.group({
    business: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  message = '';
  readonly passwordVisible = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const email = v.email.trim().toLowerCase();

    if (environment.useLiveAuth) {
      this.message = '';
      this.apiAuth.register(v.business.trim(), email, v.password).subscribe({
        next: (res) => {
          this.session.applyLiveLoginResponse(res).subscribe({
            next: () => {
              this.session.persistAuthIfRequested(res.accessToken, v.rememberMe);
              if (this.session.isTenantRestricted()) {
                this.message =
                  'Cuenta creada. Tu solicitud está en espera de confirmación: escríbenos por WhatsApp o completa el flujo en Contratar para coordinar el pago. El panel se activa cuando verifiquemos el pago.';
                return;
              }
              void this.router.navigateByUrl('/app');
            },
            error: () => {
              this.message =
                'Cuenta creada. Tu solicitud está en espera de confirmación; inicia sesión cuando te avisemos que el panel está activo.';
            },
          });
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.message = 'Ya existe una cuenta con ese correo.';
            return;
          }
          if (err instanceof HttpErrorResponse && err.status === 0) {
            this.message = 'No se pudo conectar al API. Verifica que el backend esté activo.';
            return;
          }
          this.message = 'No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.';
        },
      });
      return;
    }

    const tenant = this.data.registerNewTenant(v.business);
    const shortName = email.split('@')[0] || 'Admin';
    this.session.loginFromTenant(tenant, { userName: shortName, role: 'TENANT_ADMIN' });
    void this.router.navigateByUrl('/app');
  }

  togglePasswordVisible(): void {
    this.passwordVisible.update((v) => !v);
  }
}
