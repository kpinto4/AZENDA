import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly data = inject(MockDataService);
  private readonly session = inject(MockSessionService);

  readonly form = this.fb.nonNullable.group({
    business: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const tenant = this.data.registerNewTenant(v.business);
    const shortName = v.email.split('@')[0] || 'Admin';
    this.session.loginFromTenant(tenant, { userName: shortName, role: 'TENANT_ADMIN' });
    void this.router.navigateByUrl('/app');
  }
}
