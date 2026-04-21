import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

const MAX_IMAGE_BYTES = 600 * 1024;

@Component({
  selector: 'app-tenant-inventory',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tenant-inventory.component.html',
  styleUrl: './tenant-inventory.component.scss',
})
export class TenantInventoryComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);

  readonly imageHint = signal<string | null>(null);

  readonly tenantProducts = computed(() => {
    const tid = this.session.tenantId();
    return tid ? this.data.productsForTenant(tid) : [];
  });

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: ['', [Validators.required, Validators.minLength(1)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  createImageDataUrl = signal<string | null>(null);

  readonly moveForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    delta: [1, [Validators.required]],
    reason: ['Ajuste demo', Validators.required],
  });

  onCreateImageSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imageHint.set(null);
    this.createImageDataUrl.set(null);
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.imageHint.set('Imagen demasiado grande (máx. ~600 KB en demo).');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === 'string') {
        this.createImageDataUrl.set(r);
      }
    };
    reader.readAsDataURL(file);
  }

  clearCreateImage(): void {
    this.createImageDataUrl.set(null);
    this.imageHint.set(null);
  }

  createProduct(): void {
    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    this.data.addProduct(tid, {
      name: v.name,
      sku: v.sku,
      stock: Number(v.stock) || 0,
      imageUrl: this.createImageDataUrl(),
    });
    this.createForm.reset({ name: '', sku: '', stock: 0 });
    this.clearCreateImage();
  }

  applyMovement(): void {
    if (this.moveForm.invalid) {
      this.moveForm.markAllAsTouched();
      return;
    }
    const v = this.moveForm.getRawValue();
    this.data.applyStockMovement(this.session.tenantId(), v.productId, Number(v.delta), v.reason);
  }
}
