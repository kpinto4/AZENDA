import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-tenant-sales',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-sales.component.html',
  styleUrl: './tenant-sales.component.scss',
})
export class TenantSalesComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);

  readonly form = this.fb.nonNullable.group({
    total: [12, [Validators.required, Validators.min(1)]],
    method: ['Tarjeta', Validators.required],
    linked: [''],
    productId: [''],
    stockQty: [1, [Validators.min(1)]],
  });

  readonly methods = ['Efectivo', 'Tarjeta', 'Bizum', 'Transferencia'];

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const today = new Date().toISOString().slice(0, 10);
    const pid = v.productId?.trim() || undefined;
    this.data.addSale(
      {
        date: today,
        total: Number(v.total),
        method: v.method,
        linkedAppointment: v.linked?.trim() || undefined,
      },
      pid ? { productId: pid, stockQty: Number(v.stockQty) || 1 } : undefined,
    );
  }
}
