import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MockBusinessService, MockDataService, MockProduct } from '../../core/services/mock-data.service';
import { environment } from '../../../environments/environment';
import {
  ApiTenantCatalogResponse,
  ApiTenantCatalogService,
  ApiTenantProductDto,
  ApiTenantServiceDto,
  ApiTenantStockMovementDto,
} from '../../core/services/api-tenant-catalog.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { formatCop } from '../../core/format-currency';
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
type InventoryEntityType = 'product' | 'service';
type InventoryView = 'products' | 'services';
type PendingDelete =
  | {
      type: 'product';
      id: string;
      name: string;
      detail: string;
    }
  | {
      type: 'service';
      id: string;
      name: string;
      detail: string;
    };

/** Fila de servicio en tabla inventario (mock o API). */
type InventoryServiceRow = MockBusinessService | ApiTenantServiceDto;

@Component({
  selector: 'app-tenant-inventory',
  imports: [ReactiveFormsModule, FormatCopPipe, PromoScheduleEditorComponent],
  templateUrl: './tenant-inventory.component.html',
  styleUrl: './tenant-inventory.component.scss',
})
export class TenantInventoryComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);
  private readonly alerts = inject(UiAlertService);

  readonly imageHint = signal<string | null>(null);
  readonly flashMsg = signal<string>('');
  readonly activeView = signal<InventoryView>('products');
  readonly isEditorOpen = signal(false);
  readonly editorEntityType = signal<InventoryEntityType>('product');
  readonly editingId = signal<string | null>(null);
  readonly pendingDelete = signal<PendingDelete | null>(null);
  readonly liveProducts = signal<ApiTenantProductDto[]>([]);
  readonly liveServices = signal<ApiTenantServiceDto[]>([]);
  readonly liveStockMovements = signal<ApiTenantStockMovementDto[]>([]);

  readonly canManageCatalog = computed(
    () => this.session.role() === 'TENANT_ADMIN' && !this.session.isTenantRestricted(),
  );
  readonly inventoryBlockedMessage = computed(() => this.session.tenantRestrictionMessage());

  readonly isInventoryLiveApi = computed(
    () =>
      environment.useLiveAuth &&
      !!this.session.accessToken() &&
      this.session.isTenantUser() &&
      !this.session.isTenantRestricted(),
  );

  readonly tenantProducts = computed(() => {
    if (this.isInventoryLiveApi()) {
      return this.liveProducts().map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        description: p.description,
        price: p.price,
        promoPrice: p.promoPrice,
        sku: p.sku,
        stock: p.stock,
        lowStock: p.stock < 5,
        catalogOrder: p.catalogOrder,
        imageUrl: p.imageUrl,
      }));
    }
    const tid = this.session.tenantId();
    return tid ? this.data.productsForTenant(tid) : [];
  });
  readonly editorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    sku: [''],
    stock: [0, [Validators.required, Validators.min(0)]],
    durationMinutes: [30, [Validators.required, Validators.min(5), Validators.max(480)]],
    promo: createPromoScheduleFormGroup(this.fb),
  });

  editorImageDataUrl = signal<string | null>(null);

  readonly moveForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    delta: [1, [Validators.required]],
    reason: ['Ajuste demo', Validators.required],
  });

  readonly businessServices = computed((): InventoryServiceRow[] =>
    this.isInventoryLiveApi()
      ? this.liveServices().map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          promoPrice: s.promoPrice,
          promoEnabled: s.promoEnabled,
          promoScheduleType: s.promoScheduleType,
          promoDays: s.promoDays,
          promoStartDate: s.promoStartDate,
          promoEndDate: s.promoEndDate,
          promoLabel: s.promoLabel,
          durationMinutes: s.durationMinutes ?? 30,
        }))
      : this.data.listBusinessServicesForSlug(this.session.publicBookingSlug()),
  );
  readonly tenantCatalogLayout = computed(() => {
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return 'horizontal' as const;
    }
    return this.data.brandingForTenant(tenantId).catalogLayout;
  });

  readonly tenantStockMovements = computed(() => {
    if (this.isInventoryLiveApi()) {
      return this.liveStockMovements();
    }
    const productIds = new Set(this.tenantProducts().map((p) => p.id));
    return this.data.stockMovements().filter((m) => productIds.has(m.productId));
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.isInventoryLiveApi()) {
        untracked(() => {
          this.liveProducts.set([]);
          this.liveServices.set([]);
          this.liveStockMovements.set([]);
        });
        return;
      }
      const sub = this.apiCatalog.getCatalog().subscribe({
        next: (res) => {
          this.ingestCatalogResponse(res);
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 403) {
            return;
          }
          this.flashMsg.set('No se pudo cargar catálogo desde API.');
          this.alerts.error('No se pudo cargar catalogo desde API.');
        },
      });
      const subMov = this.apiCatalog.listStockMovements().subscribe({
        next: (rows) => this.liveStockMovements.set(rows),
        error: () => this.liveStockMovements.set([]),
      });
      onCleanup(() => {
        sub.unsubscribe();
        subMov.unsubscribe();
      });
    });
  }

  readonly isProductEditor = computed(() => this.editorEntityType() === 'product');

  readonly editorTitle = computed(() => {
    const entityLabel = this.isProductEditor() ? 'producto' : 'servicio';
    return this.editingId() ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`;
  });

  setActiveView(view: InventoryView): void {
    this.activeView.set(view);
  }

  setCatalogLayout(layout: 'horizontal' | 'grid'): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    this.data.updateTenantBranding(tenantId, { catalogLayout: layout });
    if (this.isInventoryLiveApi()) {
      this.apiCatalog.patchBranding({ catalogLayout: layout }).subscribe({
        next: () => {
          this.flashMsg.set(
            layout === 'grid'
              ? 'Vista de catálogo actualizada a cuadritos.'
              : 'Vista de catálogo actualizada a horizontal.',
          );
          this.alerts.success('Vista de catalogo actualizada.');
        },
        error: () => {
          this.flashMsg.set('No se pudo guardar en API. Verifica conexión/permisos.');
          this.alerts.error('No se pudo guardar la configuracion en API.');
        },
      });
      return;
    }
    this.flashMsg.set(
      layout === 'grid'
        ? 'Vista de catálogo actualizada a cuadritos.'
        : 'Vista de catálogo actualizada a horizontal.',
    );
    this.alerts.success('Vista de catalogo actualizada.');
  }

  openCreateProduct(): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    this.editorEntityType.set('product');
    this.editingId.set(null);
    this.editorForm.reset({
      name: '',
      description: '',
      price: 0,
      sku: '',
      stock: 0,
      durationMinutes: 30,
      promo: defaultPromoScheduleFormValue(),
    });
    this.editorImageDataUrl.set(null);
    this.imageHint.set(null);
    this.flashMsg.set('');
    this.isEditorOpen.set(true);
  }

  openCreateService(): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    this.editorEntityType.set('service');
    this.editingId.set(null);
    this.editorForm.reset({
      name: '',
      description: '',
      price: 0,
      sku: '',
      stock: 0,
      durationMinutes: 30,
      promo: defaultPromoScheduleFormValue(),
    });
    this.editorImageDataUrl.set(null);
    this.imageHint.set(null);
    this.flashMsg.set('');
    this.isEditorOpen.set(true);
  }

  openEditProduct(row: MockProduct): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    this.editorEntityType.set('product');
    this.editingId.set(row.id);
    this.editorForm.reset({
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      sku: row.sku,
      stock: row.stock,
      durationMinutes: 30,
      promo: promoFormValueFromCatalog(row),
    });
    this.editorImageDataUrl.set(row.imageUrl ?? null);
    this.imageHint.set(null);
    this.flashMsg.set('');
    this.isEditorOpen.set(true);
  }

  openEditService(row: InventoryServiceRow): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    this.editorEntityType.set('service');
    this.editingId.set(row.id);
    this.editorForm.reset({
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      sku: '',
      stock: 0,
      durationMinutes: row.durationMinutes ?? 30,
      promo: promoFormValueFromCatalog(row),
    });
    this.editorImageDataUrl.set(null);
    this.imageHint.set(null);
    this.flashMsg.set('');
    this.isEditorOpen.set(true);
  }

  closeEditor(): void {
    this.isEditorOpen.set(false);
    this.editingId.set(null);
    this.imageHint.set(null);
  }

  requestDeleteProduct(row: MockProduct): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    this.pendingDelete.set({
      type: 'product',
      id: row.id,
      name: row.name,
      detail: `SKU: ${row.sku} · Stock actual: ${row.stock}${row.promoPrice != null ? ` · Promo: ${formatCop(row.promoPrice)}` : ''}`,
    });
  }

  requestDeleteService(row: InventoryServiceRow): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    this.pendingDelete.set({
      type: 'service',
      id: row.id,
      name: row.name,
      detail: `Precio base: ${formatCop(row.price)}${row.promoPrice != null ? ` · Promo: ${formatCop(row.promoPrice)}` : ''}`,
    });
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) {
      return;
    }
    if (pending.type === 'product') {
      this.removeProduct(pending.id);
    } else {
      this.removeService(pending.id);
    }
    this.pendingDelete.set(null);
  }

  onEditorImageSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imageHint.set(null);
    this.editorImageDataUrl.set(null);
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
        this.editorImageDataUrl.set(r);
      }
    };
    reader.readAsDataURL(file);
  }

  clearEditorImage(): void {
    this.editorImageDataUrl.set(null);
    this.imageHint.set(null);
  }

  saveEditor(): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }
    const v = this.editorForm.getRawValue();
    if (this.isProductEditor() && !v.sku.trim()) {
      this.editorForm.controls.sku.setErrors({ required: true });
      this.editorForm.controls.sku.markAsTouched();
      return;
    }
    if (this.isProductEditor()) {
      this.saveProduct(tid, v);
      return;
    }
    this.saveService(v);
  }

  private saveProduct(
    tenantId: string,
    v: ReturnType<typeof this.editorForm.getRawValue>,
  ): void {
    const promo = promoPayloadFromFormValue(v.promo as PromoScheduleFormValue);
    const payload = {
      name: v.name,
      description: v.description,
      price: Number(v.price),
      sku: v.sku,
      stock: Number(v.stock) || 0,
      imageUrl: this.editorImageDataUrl(),
      ...promo,
    };
    const editing = this.editingId();
    if (this.isInventoryLiveApi()) {
      const req = editing
        ? this.apiCatalog.updateProduct(editing, payload)
        : this.apiCatalog.createProduct(payload);
      req.subscribe({
        next: () => {
          this.flashMsg.set(editing ? 'Producto actualizado.' : 'Producto creado.');
          this.alerts.success(editing ? 'Producto actualizado.' : 'Producto creado.');
          this.closeEditor();
          this.refreshInventoryLive();
        },
        error: () => {
          this.flashMsg.set('No se pudo guardar producto en API.');
          this.alerts.error('No se pudo guardar producto en API.');
        },
      });
      return;
    }
    if (editing) {
      this.data.updateProduct(tenantId, editing, payload);
      this.flashMsg.set('Producto actualizado.');
      this.alerts.success('Producto actualizado.');
    } else {
      this.data.addProduct(tenantId, payload);
      this.flashMsg.set('Producto creado.');
      this.alerts.success('Producto creado.');
    }
    this.closeEditor();
  }

  private saveService(v: ReturnType<typeof this.editorForm.getRawValue>): void {
    const promo = promoPayloadFromFormValue(v.promo as PromoScheduleFormValue);
    const payload = {
      name: v.name,
      description: v.description,
      price: Number(v.price),
      durationMinutes: Number(v.durationMinutes) || 30,
      ...promo,
    };
    const editing = this.editingId();
    if (this.isInventoryLiveApi()) {
      const req = editing
        ? this.apiCatalog.updateService(editing, payload)
        : this.apiCatalog.createService(payload);
      req.subscribe({
        next: () => {
          this.flashMsg.set(editing ? 'Servicio actualizado.' : 'Servicio creado.');
          this.alerts.success(editing ? 'Servicio actualizado.' : 'Servicio creado.');
          this.closeEditor();
          this.refreshInventoryLive();
        },
        error: () => {
          this.flashMsg.set('No se pudo guardar servicio en API.');
          this.alerts.error('No se pudo guardar servicio en API.');
        },
      });
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    if (editing) {
      this.data.updateBusinessService(slug, editing, payload);
      this.flashMsg.set('Servicio actualizado.');
      this.alerts.success('Servicio actualizado.');
    } else {
      this.data.createBusinessService(slug, payload);
      this.flashMsg.set('Servicio creado.');
      this.alerts.success('Servicio creado.');
    }
    this.closeEditor();
  }

  applyMovement(): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    if (this.moveForm.invalid) {
      this.moveForm.markAllAsTouched();
      return;
    }
    const v = this.moveForm.getRawValue();
    const delta = Number(v.delta);

    if (this.isInventoryLiveApi()) {
      const productId = v.productId;
      const delta = Number(v.delta);
      this.apiCatalog
        .applyStockMovement({
          productId,
          delta,
          reason: v.reason.trim() || 'Ajuste manual',
        })
        .subscribe({
          next: () => {
            this.flashMsg.set('Stock actualizado.');
            this.alerts.success('Movimiento de stock aplicado.');
            this.refreshInventoryLive();
          },
          error: (err: HttpErrorResponse) => {
            const m = err.error?.message;
            const msg = Array.isArray(m) ? m.join('. ') : m ?? 'No se pudo actualizar stock.';
            this.flashMsg.set(String(msg));
            this.alerts.error(String(msg));
          },
        });
      return;
    }

    const tid = this.session.tenantId();
    if (!tid) {
      return;
    }
    this.data.applyStockMovement(tid, v.productId, delta, v.reason);
    this.alerts.success('Movimiento aplicado solo en esta sesión (no se guardó en la base de datos).');
    this.moveForm.patchValue({ delta: 1, reason: 'Ajuste demo' });
  }

  moveProduct(productId: string, dir: -1 | 1): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    if (this.isInventoryLiveApi()) {
      this.apiCatalog.moveProduct(productId, dir).subscribe({
        next: () => {
          this.flashMsg.set('Orden de producto actualizado.');
          this.alerts.info('Orden de producto actualizada.');
          this.refreshInventoryLive();
        },
        error: () => {
          this.flashMsg.set('No se pudo reordenar producto en API.');
          this.alerts.error('No se pudo reordenar producto en API.');
        },
      });
      return;
    }
    this.data.moveCatalogProduct(tenantId, productId, dir);
    this.flashMsg.set('Orden de producto actualizado.');
    this.alerts.info('Orden de producto actualizada.');
  }

  moveService(serviceId: string, dir: -1 | 1): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    if (this.isInventoryLiveApi()) {
      this.apiCatalog.moveService(serviceId, dir).subscribe({
        next: () => {
          this.flashMsg.set('Orden de servicio actualizado.');
          this.alerts.info('Orden de servicio actualizada.');
          this.refreshInventoryLive();
        },
        error: () => {
          this.flashMsg.set('No se pudo reordenar servicio en API.');
          this.alerts.error('No se pudo reordenar servicio en API.');
        },
      });
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    this.data.moveBusinessService(slug, serviceId, dir);
    this.flashMsg.set('Orden de servicio actualizado.');
    this.alerts.info('Orden de servicio actualizada.');
  }

  removeProduct(productId: string): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    if (this.isInventoryLiveApi()) {
      this.apiCatalog.deleteProduct(productId).subscribe({
        next: () => {
          if (this.editingId() === productId) {
            this.closeEditor();
          }
          this.flashMsg.set('Producto eliminado.');
          this.alerts.warning('Producto eliminado.');
          this.refreshInventoryLive();
        },
        error: () => {
          this.flashMsg.set('No se pudo eliminar producto en API.');
          this.alerts.error('No se pudo eliminar producto en API.');
        },
      });
      return;
    }
    this.data.deleteProduct(tenantId, productId);
    if (this.editingId() === productId) {
      this.closeEditor();
    }
    this.flashMsg.set('Producto eliminado.');
    this.alerts.warning('Producto eliminado.');
  }

  removeService(serviceId: string): void {
    if (!this.canManageCatalog()) {
      this.notifyRestriction();
      return;
    }
    if (this.isInventoryLiveApi()) {
      this.apiCatalog.deleteService(serviceId).subscribe({
        next: () => {
          if (this.editingId() === serviceId) {
            this.closeEditor();
          }
          this.flashMsg.set('Servicio eliminado.');
          this.alerts.warning('Servicio eliminado.');
          this.refreshInventoryLive();
        },
        error: () => {
          this.flashMsg.set('No se pudo eliminar servicio en API.');
          this.alerts.error('No se pudo eliminar servicio en API.');
        },
      });
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    this.data.deleteBusinessService(slug, serviceId);
    if (this.editingId() === serviceId) {
      this.closeEditor();
    }
    this.flashMsg.set('Servicio eliminado.');
    this.alerts.warning('Servicio eliminado.');
  }

  private ingestCatalogResponse(res: ApiTenantCatalogResponse): void {
    this.liveProducts.set(res.products);
    this.liveServices.set(res.services);
    const tenantId = this.session.tenantId();
    if (tenantId) {
      this.data.updateTenantBranding(tenantId, {
        displayName: res.branding.displayName,
        logoUrl: res.branding.logoUrl,
        publicAddress: res.branding.publicAddress,
        publicMapsUrl: res.branding.publicMapsUrl,
        cancellationPolicy: res.branding.cancellationPolicy,
        reminderNotice: res.branding.reminderNotice,
        catalogLayout: res.branding.catalogLayout,
        primaryColor: res.branding.primaryColor,
        accentColor: res.branding.accentColor,
        bgColor: res.branding.bgColor,
        surfaceColor: res.branding.surfaceColor,
        textColor: res.branding.textColor,
        borderRadiusPx: res.branding.borderRadiusPx,
        useGradient: res.branding.useGradient,
        gradientFrom: res.branding.gradientFrom,
        gradientTo: res.branding.gradientTo,
        gradientAngleDeg: res.branding.gradientAngleDeg,
      });
    }
  }

  /** Recarga catálogo y movimientos cuando el panel usa API real. */
  refreshInventoryLive(): void {
    this.apiCatalog.getCatalog().subscribe({
      next: (res) => this.ingestCatalogResponse(res),
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 403) {
          return;
        }
        this.flashMsg.set('No se pudo cargar catálogo desde API.');
        this.alerts.error('No se pudo cargar catalogo desde API.');
      },
    });
    this.apiCatalog.listStockMovements().subscribe({
      next: (rows) => this.liveStockMovements.set(rows),
      error: () => {},
    });
  }

  formatMovementDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  movementRowDate(m: { at?: string; createdAt?: string }): string {
    return this.formatMovementDate(m.createdAt ?? m.at ?? '');
  }

  private notifyRestriction(): void {
    this.alerts.warning(
      this.session.tenantRestrictionMessage() ?? 'Tu plan actual no permite esta accion.',
    );
  }
}
