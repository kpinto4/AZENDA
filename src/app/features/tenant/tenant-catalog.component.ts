import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MockBusinessService,
  MockDataService,
} from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { UiAlertService } from '../../core/services/ui-alert.service';

const MAX_IMAGE_BYTES = 600 * 1024;

@Component({
  selector: 'app-tenant-catalog',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './tenant-catalog.component.html',
  styleUrl: './tenant-catalog.component.scss',
})
export class TenantCatalogComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly alerts = inject(UiAlertService);

  readonly imageHint = signal<string | null>(null);
  readonly servicesMsg = signal('');
  readonly editingServiceId = signal<string | null>(null);
  readonly servicesForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    promoPrice: [null as number | null],
    promoLabel: [''],
  });

  readonly tenantProducts = computed(() => {
    const tid = this.session.tenantId();
    return tid ? this.data.productsForTenant(tid) : [];
  });

  readonly businessServices = computed(() =>
    this.data.listBusinessServicesForSlug(this.session.publicBookingSlug()),
  );
  readonly catalogBlockedMessage = computed(() => this.session.tenantRestrictionMessage());
  readonly canEditCatalog = computed(
    () => this.session.role() === 'TENANT_ADMIN' && !this.session.isTenantRestricted(),
  );

  constructor() {
    effect(() => {
      if (this.canEditCatalog()) {
        this.servicesForm.enable({ emitEvent: false });
      } else {
        this.servicesForm.disable({ emitEvent: false });
      }
    });
  }

  onRowImageSelected(productId: string, ev: Event): void {
    if (!this.canEditCatalog()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Accion no permitida.');
      return;
    }
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
    if (!this.canEditCatalog()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Accion no permitida.');
      return;
    }
    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    this.data.setProductImage(tid, productId, null);
  }

  move(productId: string, dir: -1 | 1): void {
    if (!this.canEditCatalog()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Accion no permitida.');
      return;
    }
    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    this.data.moveCatalogProduct(tid, productId, dir);
    this.alerts.info('Orden del catalogo actualizada.');
  }

  saveServicesCatalog(): void {
    if (!this.canEditCatalog()) {
      const msg = this.session.tenantRestrictionMessage() ?? 'Operacion no permitida.';
      this.servicesMsg.set(msg);
      this.alerts.warning(msg);
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug || this.servicesForm.invalid) {
      this.servicesForm.markAllAsTouched();
      return;
    }
    const v = this.servicesForm.getRawValue();
    const payload = {
      name: v.name,
      description: v.description,
      price: Number(v.price),
      promoPrice: v.promoPrice == null ? null : Number(v.promoPrice),
      promoLabel: v.promoLabel,
    };
    const editing = this.editingServiceId();
    if (editing) {
      this.data.updateBusinessService(slug, editing, payload);
      this.servicesMsg.set('Servicio actualizado.');
      this.alerts.success('Servicio actualizado.');
    } else {
      this.data.createBusinessService(slug, payload);
      this.servicesMsg.set('Servicio creado.');
      this.alerts.success('Servicio creado.');
    }
    this.cancelEditService();
  }

  editService(row: MockBusinessService): void {
    if (!this.canEditCatalog()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Accion no permitida.');
      return;
    }
    this.editingServiceId.set(row.id);
    this.servicesForm.patchValue({
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      promoPrice: row.promoPrice ?? null,
      promoLabel: row.promoLabel ?? '',
    });
    this.servicesMsg.set('');
  }

  cancelEditService(): void {
    this.editingServiceId.set(null);
    this.servicesForm.reset({
      name: '',
      description: '',
      price: 0,
      promoPrice: null,
      promoLabel: '',
    });
  }

  async removeService(serviceId: string): Promise<void> {
    if (!this.canEditCatalog()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Accion no permitida.');
      return;
    }
    const ok = await this.alerts.confirm({
      title: 'Eliminar servicio',
      message: 'Esta accion borrara el servicio del catalogo. ¿Deseas continuar?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) {
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    this.data.deleteBusinessService(slug, serviceId);
    if (this.editingServiceId() === serviceId) {
      this.cancelEditService();
    }
    this.servicesMsg.set('Servicio eliminado.');
    this.alerts.warning('Servicio eliminado.');
  }
}
