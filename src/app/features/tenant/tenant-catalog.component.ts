import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiTenantCatalogService,
  ApiTenantProductDto,
  ApiTenantServiceDto,
} from '../../core/services/api-tenant-catalog.service';
import {
  MockBusinessService,
  MockDataService,
  MockProduct,
} from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { FormatCopPipe } from '../../core/format-cop.pipe';
import { UiAlertService } from '../../core/services/ui-alert.service';
import {
  createPromoScheduleFormGroup,
  defaultPromoScheduleFormValue,
  promoFormValueFromCatalog,
  promoPayloadFromFormValue,
  type PromoScheduleFormValue,
} from '../../core/promo-form.util';
import { PromoScheduleEditorComponent } from '../../shared/promo/promo-schedule-editor.component';

const MAX_IMAGE_BYTES = 600 * 1024;

/** Fila de servicio en tabla (mock o API). */
type CatalogServiceRow = MockBusinessService | ApiTenantServiceDto;

@Component({
  selector: 'app-tenant-catalog',
  imports: [RouterLink, ReactiveFormsModule, FormatCopPipe, PromoScheduleEditorComponent],
  templateUrl: './tenant-catalog.component.html',
  styleUrl: './tenant-catalog.component.scss',
})
export class TenantCatalogComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly alerts = inject(UiAlertService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);

  readonly catalogProductsLive = signal<ApiTenantProductDto[]>([]);
  readonly catalogServicesLive = signal<ApiTenantServiceDto[]>([]);

  readonly imageHint = signal<string | null>(null);
  readonly servicesMsg = signal('');
  readonly editingServiceId = signal<string | null>(null);
  readonly servicesForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    durationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(480)]],
    promo: createPromoScheduleFormGroup(this.fb),
  });

  readonly isCatalogLiveApi = computed(
    () =>
      environment.useLiveAuth &&
      !!this.session.accessToken() &&
      this.session.isTenantUser() &&
      !this.session.isTenantRestricted(),
  );

  readonly tenantProducts = computed((): (MockProduct | ApiTenantProductDto)[] => {
    if (this.isCatalogLiveApi()) {
      return this.catalogProductsLive();
    }
    const tid = this.session.tenantId();
    return tid ? this.data.productsForTenant(tid) : [];
  });

  readonly businessServices = computed((): CatalogServiceRow[] => {
    if (this.isCatalogLiveApi()) {
      return this.catalogServicesLive();
    }
    return this.data.listBusinessServicesForSlug(this.session.publicBookingSlug());
  });

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

    effect((onCleanup) => {
      if (!this.isCatalogLiveApi()) {
        untracked(() => {
          this.catalogProductsLive.set([]);
          this.catalogServicesLive.set([]);
        });
        return;
      }
      const sub = this.apiCatalog.getCatalog().subscribe({
        next: (c) => {
          this.catalogProductsLive.set(c.products);
          this.catalogServicesLive.set(c.services);
        },
        error: () => {
          this.catalogProductsLive.set([]);
          this.catalogServicesLive.set([]);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  private refreshCatalogLive(): void {
    if (!this.isCatalogLiveApi()) {
      return;
    }
    this.apiCatalog.getCatalog().subscribe({
      next: (c) => {
        this.catalogProductsLive.set(c.products);
        this.catalogServicesLive.set(c.services);
      },
      error: () => {},
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
      if (typeof r !== 'string') {
        return;
      }
      if (this.isCatalogLiveApi()) {
        const p = this.catalogProductsLive().find((x) => x.id === productId);
        if (!p) {
          return;
        }
        this.apiCatalog
          .updateProduct(productId, {
            name: p.name,
            description: p.description,
            price: p.price,
            promoPrice: p.promoPrice,
            sku: p.sku,
            stock: p.stock,
            imageUrl: r,
          })
          .subscribe({
            next: () => this.refreshCatalogLive(),
            error: () => this.alerts.error('No se pudo guardar la imagen.'),
          });
        return;
      }
      this.data.setProductImage(tid, productId, r);
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
    if (this.isCatalogLiveApi()) {
      const p = this.catalogProductsLive().find((x) => x.id === productId);
      if (!p) {
        return;
      }
      this.apiCatalog
        .updateProduct(productId, {
          name: p.name,
          description: p.description,
          price: p.price,
          promoPrice: p.promoPrice,
          sku: p.sku,
          stock: p.stock,
          imageUrl: null,
        })
        .subscribe({
          next: () => this.refreshCatalogLive(),
          error: () => this.alerts.error('No se pudo quitar la imagen.'),
        });
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
    if (this.isCatalogLiveApi()) {
      this.apiCatalog.moveProduct(productId, dir).subscribe({
        next: () => {
          this.refreshCatalogLive();
          this.alerts.info('Orden del catalogo actualizada.');
        },
        error: () => this.alerts.error('No se pudo cambiar el orden.'),
      });
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
    if (this.servicesForm.invalid) {
      this.servicesForm.markAllAsTouched();
      return;
    }
    const v = this.servicesForm.getRawValue();
    const promo = promoPayloadFromFormValue(v.promo as PromoScheduleFormValue);
    const payload = {
      name: v.name.trim(),
      description: v.description?.trim() || null,
      price: Number(v.price),
      durationMinutes: Number(v.durationMinutes) || 30,
      ...promo,
    };
    const editing = this.editingServiceId();

    if (this.isCatalogLiveApi()) {
      if (editing) {
        this.apiCatalog
          .updateService(editing, payload)
          .pipe(finalize(() => this.cancelEditService()))
          .subscribe({
            next: () => {
              this.servicesMsg.set('Servicio actualizado.');
              this.alerts.success('Servicio actualizado.');
              this.refreshCatalogLive();
            },
            error: () => {
              this.servicesMsg.set('Error al actualizar.');
              this.alerts.error('No se pudo actualizar el servicio.');
            },
          });
      } else {
        this.apiCatalog
          .createService(payload)
          .pipe(finalize(() => this.cancelEditService()))
          .subscribe({
            next: () => {
              this.servicesMsg.set('Servicio creado.');
              this.alerts.success('Servicio creado.');
              this.refreshCatalogLive();
            },
            error: () => {
              this.servicesMsg.set('Error al crear.');
              this.alerts.error('No se pudo crear el servicio.');
            },
          });
      }
      return;
    }

    const slug = this.session.publicBookingSlug();
    if (!slug) {
      this.servicesForm.markAllAsTouched();
      return;
    }
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

  editService(row: CatalogServiceRow): void {
    if (!this.canEditCatalog()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Accion no permitida.');
      return;
    }
    this.editingServiceId.set(row.id);
    this.servicesForm.patchValue({
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      durationMinutes: 'durationMinutes' in row ? (row.durationMinutes ?? 30) : 30,
      promo: promoFormValueFromCatalog(row),
    });
    this.servicesMsg.set('');
  }

  cancelEditService(): void {
    this.editingServiceId.set(null);
    this.servicesForm.reset({
      name: '',
      description: '',
      price: 0,
      durationMinutes: 30,
      promo: defaultPromoScheduleFormValue(),
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

    if (this.isCatalogLiveApi()) {
      this.apiCatalog.deleteService(serviceId).subscribe({
        next: () => {
          if (this.editingServiceId() === serviceId) {
            this.cancelEditService();
          }
          this.servicesMsg.set('Servicio eliminado.');
          this.alerts.warning('Servicio eliminado.');
          this.refreshCatalogLive();
        },
        error: () => this.alerts.error('No se pudo eliminar el servicio.'),
      });
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
