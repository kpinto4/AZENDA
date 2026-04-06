import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-super-users',
  imports: [ReactiveFormsModule],
  templateUrl: './super-users.component.html',
  styleUrl: './super-users.component.scss',
})
export class SuperUsersComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);

  readonly roles = ['ADMIN', 'EMPLEADO', 'SUPER_ADMIN'];

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['ADMIN', Validators.required],
    tenantLabel: ['Barbería Centro', Validators.required],
  });

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.data.addPlatformUser(v.email, v.role, v.tenantLabel);
    this.form.patchValue({ email: '' });
  }
}
