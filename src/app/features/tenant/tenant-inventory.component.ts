import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MockBusinessService, MockDataService, MockProduct } from '../../core/services/mock-data.service';
import { environment } from '../../../environments/environment';
import {
  ApiTenantCatalogService,
  ApiTenantProductDto,
  ApiTenantServiceDto,
} from '../../core/services/api-tenant-catalog.service';
import { MockSessionService } from '../../core/services/mock-session.service';

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

@Component({
  selector: 'app-tenant-inventory',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-inventory.component.html',
  styleUrl: './tenant-inventory.component.scss',
})
export class TenantInventoryComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);

  readonly imageHint = signal<string | null>(null);
  readonly flashMsg = signal<string>('');
  readonly activeView = signal<InventoryView>('products');
  readonly isEditorOpen = signal(false);
  readonly editorEntityType = signal<InventoryEntityType>('product');
  readonly editingId = signal<string | null>(null);
  readonly pendingDelete = signal<PendingDelete | null>(null);
  readonly liveProducts = signal<ApiTenantProductDto[]>([]);
  readonly liveServices = signal<ApiTenantServiceDto[]>([]);

  readonly tenantProducts = computed(() => {
    if (environment.useLiveAuth && this.session.accessToken()) {
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
  readonly canManageCatalog = computed(() => this.session.role() === 'TENANT_ADMIN');

  readonly editorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    sku: [''],
    stock: [0, [Validators.required, Validators.min(0)]],
    promoPrice: [null as number | null],
    promoLabel: [''],
  });

  editorImageDataUrl = signal<string | null>(null);

  readonly moveForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    delta: [1, [Validators.required]],
    reason: ['Ajuste demo', Validators.required],
  });

  readonly businessServices = computed(() =>
    environment.useLiveAuth && this.session.accessToken()
      ? this.liveServices().map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          promoPrice: s.promoPrice,
          promoLabel: s.promoLabel,
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

  constructor() {
    effect(() => {
      const tenantId = this.session.tenantId();
      const token = this.session.accessToken();
      if (!tenantId || !environment.useLiveAuth || !token) {
        return;
      }
      untracked(() => this.reloadCatalogFromApi());
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
      return;
    }
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    this.data.updateTenantBranding(tenantId, { catalogLayout: layout });
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.patchBranding({ catalogLayout: layout }).subscribe({
        next: () => {
          this.flashMsg.set(
            layout === 'grid'
              ? 'Vista de catálogo actualizada a cuadritos.'
              : 'Vista de catálogo actualizada a horizontal.',
          );
        },
        error: () => {
          this.flashMsg.set('No se pudo guardar en API. Verifica conexión/permisos.');
        },
      });
      return;
    }
    this.flashMsg.set(
      layout === 'grid'
        ? 'Vista de catálogo actualizada a cuadritos.'
        : 'Vista de catálogo actualizada a horizontal.',
    );
  }

  openCreateProduct(): void {
    if (!this.canManageCatalog()) {
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
      promoPrice: null,
      promoLabel: '',
    });
    this.editorImageDataUrl.set(null);
    this.imageHint.set(null);
    this.flashMsg.set('');
    this.isEditorOpen.set(true);
  }

  openCreateService(): void {
    if (!this.canManageCatalog()) {
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
      promoPrice: null,
      promoLabel: '',
    });
    this.editorImageDataUrl.set(null);
    this.imageHint.set(null);
    this.flashMsg.set('');
    this.isEditorOpen.set(true);
  }

  openEditProduct(row: MockProduct): void {
    if (!this.canManageCatalog()) {
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
      promoPrice: row.promoPrice ?? null,
      promoLabel: '',
    });
    this.editorImageDataUrl.set(row.imageUrl ?? null);
    this.imageHint.set(null);
    this.flashMsg.set('');
    this.isEditorOpen.set(true);
  }

  openEditService(row: MockBusinessService): void {
    if (!this.canManageCatalog()) {
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
      promoPrice: row.promoPrice ?? null,
      promoLabel: row.promoLabel ?? '',
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
      return;
    }
    this.pendingDelete.set({
      type: 'product',
      id: row.id,
      name: row.name,
      detail: `SKU: ${row.sku} · Stock actual: ${row.stock}${row.promoPrice != null ? ` · Promo: $${row.promoPrice.toFixed(2)}` : ''}`,
    });
  }

  requestDeleteService(row: MockBusinessService): void {
    if (!this.canManageCatalog()) {
      return;
    }
    this.pendingDelete.set({
      type: 'service',
      id: row.id,
      name: row.name,
      detail: `Precio base: $${row.price.toFixed(2)}${row.promoPrice != null ? ` · Promo: $${row.promoPrice.toFixed(2)}` : ''}`,
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
    v: {
      name: string;
      description: string;
      price: number;
      sku: string;
      stock: number;
      promoPrice: number | null;
      promoLabel: string;
    },
  ): void {
    const payload = {
      name: v.name,
      description: v.description,
      price: Number(v.price),
      promoPrice: v.promoPrice == null ? null : Number(v.promoPrice),
      sku: v.sku,
      stock: Number(v.stock) || 0,
      imageUrl: this.editorImageDataUrl(),
    };
    const editing = this.editingId();
    if (environment.useLiveAuth && this.session.accessToken()) {
      const req = editing
        ? this.apiCatalog.updateProduct(editing, payload)
        : this.apiCatalog.createProduct(payload);
      req.subscribe({
        next: () => {
          this.flashMsg.set(editing ? 'Producto actualizado.' : 'Producto creado.');
          this.closeEditor();
          this.reloadCatalogFromApi();
        },
        error: () => this.flashMsg.set('No se pudo guardar producto en API.'),
      });
      return;
    }
    if (editing) {
      this.data.updateProduct(tenantId, editing, payload);
      this.flashMsg.set('Producto actualizado.');
    } else {
      this.data.addProduct(tenantId, payload);
      this.flashMsg.set('Producto creado.');
    }
    this.closeEditor();
  }

  private saveService(v: {
    name: string;
    description: string;
    price: number;
    sku: string;
    stock: number;
    promoPrice: number | null;
    promoLabel: string;
  }): void {
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    const payload = {
      name: v.name,
      description: v.description,
      price: Number(v.price),
      promoPrice: v.promoPrice == null ? null : Number(v.promoPrice),
      promoLabel: v.promoLabel,
    };
    const editing = this.editingId();
    if (environment.useLiveAuth && this.session.accessToken()) {
      const req = editing
        ? this.apiCatalog.updateService(editing, payload)
        : this.apiCatalog.createService(payload);
      req.subscribe({
        next: () => {
          this.flashMsg.set(editing ? 'Servicio actualizado.' : 'Servicio creado.');
          this.closeEditor();
          this.reloadCatalogFromApi();
        },
        error: () => this.flashMsg.set('No se pudo guardar servicio en API.'),
      });
      return;
    }
    if (editing) {
      this.data.updateBusinessService(slug, editing, payload);
      this.flashMsg.set('Servicio actualizado.');
    } else {
      this.data.createBusinessService(slug, payload);
      this.flashMsg.set('Servicio creado.');
    }
    this.closeEditor();
  }

  applyMovement(): void {
    if (!this.canManageCatalog()) {
      return;
    }
    if (this.moveForm.invalid) {
      this.moveForm.markAllAsTouched();
      return;
    }
    const v = this.moveForm.getRawValue();
    this.data.applyStockMovement(this.session.tenantId(), v.productId, Number(v.delta), v.reason);
  }

  moveProduct(productId: string, dir: -1 | 1): void {
    if (!this.canManageCatalog()) {
      return;
    }
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.moveProduct(productId, dir).subscribe({
        next: () => {
          this.flashMsg.set('Orden de producto actualizado.');
          this.reloadCatalogFromApi();
        },
        error: () => this.flashMsg.set('No se pudo reordenar producto en API.'),
      });
      return;
    }
    this.data.moveCatalogProduct(tenantId, productId, dir);
    this.flashMsg.set('Orden de producto actualizado.');
  }

  moveService(serviceId: string, dir: -1 | 1): void {
    if (!this.canManageCatalog()) {
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.moveService(serviceId, dir).subscribe({
        next: () => {
          this.flashMsg.set('Orden de servicio actualizado.');
          this.reloadCatalogFromApi();
        },
        error: () => this.flashMsg.set('No se pudo reordenar servicio en API.'),
      });
      return;
    }
    this.data.moveBusinessService(slug, serviceId, dir);
    this.flashMsg.set('Orden de servicio actualizado.');
  }

  removeProduct(productId: string): void {
    if (!this.canManageCatalog()) {
      return;
    }
    const tenantId = this.session.tenantId();
    if (!tenantId) {
      return;
    }
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.deleteProduct(productId).subscribe({
        next: () => {
          if (this.editingId() === productId) {
            this.closeEditor();
          }
          this.flashMsg.set('Producto eliminado.');
          this.reloadCatalogFromApi();
        },
        error: () => this.flashMsg.set('No se pudo eliminar producto en API.'),
      });
      return;
    }
    this.data.deleteProduct(tenantId, productId);
    if (this.editingId() === productId) {
      this.closeEditor();
    }
    this.flashMsg.set('Producto eliminado.');
  }

  removeService(serviceId: string): void {
    if (!this.canManageCatalog()) {
      return;
    }
    const slug = this.session.publicBookingSlug();
    if (!slug) {
      return;
    }
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiCatalog.deleteService(serviceId).subscribe({
        next: () => {
          if (this.editingId() === serviceId) {
            this.closeEditor();
          }
          this.flashMsg.set('Servicio eliminado.');
          this.reloadCatalogFromApi();
        },
        error: () => this.flashMsg.set('No se pudo eliminar servicio en API.'),
      });
      return;
    }
    this.data.deleteBusinessService(slug, serviceId);
    if (this.editingId() === serviceId) {
      this.closeEditor();
    }
    this.flashMsg.set('Servicio eliminado.');
  }

  private reloadCatalogFromApi(): void {
    this.apiCatalog.getCatalog().subscribe({
      next: (res) => {
        this.liveProducts.set(res.products);
        this.liveServices.set(res.services);
        const tenantId = this.session.tenantId();
        if (tenantId) {
          this.data.updateTenantBranding(tenantId, {
            displayName: res.branding.displayName,
            logoUrl: res.branding.logoUrl,
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
      },
      error: () => {
        this.flashMsg.set('No se pudo cargar catálogo desde API.');
      },
    });
  }
}
