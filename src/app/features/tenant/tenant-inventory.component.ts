import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';

@Component({
  selector: 'app-tenant-inventory',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-inventory.component.html',
  styleUrl: './tenant-inventory.component.scss',
})
export class TenantInventoryComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);

  readonly moveForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    delta: [1, [Validators.required]],
    reason: ['Ajuste demo', Validators.required],
  });

  applyMovement(): void {
    if (this.moveForm.invalid) {
      this.moveForm.markAllAsTouched();
      return;
    }
    const v = this.moveForm.getRawValue();
    this.data.applyStockMovement(v.productId, Number(v.delta), v.reason);
  }
}
