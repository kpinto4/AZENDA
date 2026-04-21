import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

const MAX_IMAGE_BYTES = 600 * 1024;

@Component({
  selector: 'app-tenant-catalog',
  imports: [RouterLink],
  templateUrl: './tenant-catalog.component.html',
  styleUrl: './tenant-catalog.component.scss',
})
export class TenantCatalogComponent {
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);

  readonly imageHint = signal<string | null>(null);

  readonly tenantProducts = computed(() => {
    const tid = this.session.tenantId();
    return tid ? this.data.productsForTenant(tid) : [];
  });

  onRowImageSelected(productId: string, ev: Event): void {
    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imageHint.set(null);
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
        this.data.setProductImage(tid, productId, r);
      }
    };
    reader.readAsDataURL(file);
  }

  clearImage(productId: string): void {
    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    this.data.setProductImage(tid, productId, null);
  }

  move(productId: string, dir: -1 | 1): void {
    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    this.data.moveCatalogProduct(tid, productId, dir);
  }
}
