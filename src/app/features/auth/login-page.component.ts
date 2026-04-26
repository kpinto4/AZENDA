import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiAuthService } from '../../core/services/api-auth.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  protected readonly environment = environment;
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);
  private readonly apiAuth = inject(ApiAuthService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  message = '';
  readonly passwordVisible = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.controls.email.getRawValue().trim().toLowerCase();
    const password = this.form.controls.password.getRawValue();

    if (environment.useLiveAuth) {
      this.message = '';
      this.apiAuth.login(email, password).subscribe({
        next: (res) => {
          this.session.applyLiveLoginResponse(res).subscribe({
            next: () => {
              const remember = this.form.controls.rememberMe.getRawValue();
              this.session.persistAuthIfRequested(res.accessToken, remember);
              const fallback =
                res.user.role === 'SUPER_ADMIN' ? '/super' : '/app';
              void this.navigateAfterLogin(fallback);
            },
            error: (err: unknown) => {
              if (err instanceof HttpErrorResponse && err.status) {
                this.message = `No se pudo cargar el contexto del negocio (HTTP ${err.status}). Si el API esta en marcha, revisa la consola de red.`;
                return;
              }
              this.message =
                'Error al cargar el contexto del tenant. Revisa que el API este en marcha.';
            },
          });
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.message = 'Credenciales invalidas.';
            return;
          }
          if (err instanceof HttpErrorResponse && err.status === 400) {
            this.message =
              'Datos de acceso no validos (revisa el formato del correo y la contraseña).';
            return;
          }
          this.message =
            'No se pudo conectar al API. Comprueba que el backend este en http://localhost:3000';
        },
      });
      return;
    }

    if (email.includes('super')) {
      this.session.loginAsSuperAdmin();
      void this.navigateAfterLogin('/super');
      return;
    }

    const pick = (id: string) => this.data.tenantById(id) ?? this.data.tenants()[0];

    if (email.includes('spa')) {
      const t = pick('t2');
      this.session.loginFromTenant(t, { userName: 'Admin Spa', role: 'TENANT_ADMIN' });
      void this.navigateAfterLogin('/app');
      return;
    }
    if (email.includes('clinica') || email.includes('trial')) {
      const t = pick('t3');
      this.session.loginFromTenant(t, { userName: 'Admin Clínica', role: 'TENANT_ADMIN' });
      void this.navigateAfterLogin('/app');
      return;
    }
    if (email.includes('empleado') || email.includes('employee')) {
      const t = pick('t1');
      this.session.loginFromTenant(t, { userName: 'Carlos Ruiz', role: 'EMPLOYEE' });
      void this.navigateAfterLogin('/app');
      return;
    }

    const t = pick('t1');
    this.session.loginFromTenant(t, { userName: 'María López', role: 'TENANT_ADMIN' });
    void this.navigateAfterLogin('/app');
  }

  private navigateAfterLogin(fallback: string): void {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    const target = redirect && redirect.startsWith('/') ? redirect : fallback;
    void this.router.navigateByUrl(target);
  }

  togglePasswordVisible(): void {
    this.passwordVisible.update((v) => !v);
  }
}
