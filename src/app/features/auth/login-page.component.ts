import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(MockSessionService);
  private readonly data = inject(MockDataService);

  readonly form = this.fb.nonNullable.group({
    email: ['demo@azenda.app', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  message = '';

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.controls.email.getRawValue().toLowerCase();
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
}
