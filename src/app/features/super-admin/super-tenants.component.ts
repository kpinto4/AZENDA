import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockDataService, TenantModuleKey } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-super-tenants',
  imports: [ReactiveFormsModule],
  templateUrl: './super-tenants.component.html',
  styleUrl: './super-tenants.component.scss',
})
export class SuperTenantsComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);

  readonly moduleKeys: TenantModuleKey[] = ['citas', 'ventas', 'inventario'];
  readonly plans = ['Trial', 'Básico', 'Pro', 'Negocio'];

  readonly addForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    plan: ['Trial', Validators.required],
  });

  addTenant(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const v = this.addForm.getRawValue();
    this.data.addTenant(v.name, v.plan);
    this.addForm.reset({ name: '', plan: 'Trial' });
  }
}
