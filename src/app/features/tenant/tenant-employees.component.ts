import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-tenant-employees',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-employees.component.html',
  styleUrl: './tenant-employees.component.scss',
})
export class TenantEmployeesComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    role: ['Barbero', Validators.required],
    services: ['Corte, Barba', Validators.required],
  });

  invite(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.data.addEmployee(v.name, v.role, v.services);
    this.form.reset({ name: '', role: 'Barbero', services: 'Corte, Barba' });
  }
}
