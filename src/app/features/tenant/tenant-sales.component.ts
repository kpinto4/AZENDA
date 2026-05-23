import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiStoreVisitDto, ApiStoreVisitsService } from '../../core/services/api-store-visits.service';
import {
  ApiTenantCatalogService,
  ApiTenantProductDto,
} from '../../core/services/api-tenant-catalog.service';
import { ApiTenantSaleDto, ApiTenantSalesService } from '../../core/services/api-tenant-sales.service';
import { MockDataService, MockProduct } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { FormatCopPipe } from '../../core/format-cop.pipe';
import { UiAlertService } from '../../core/services/ui-alert.service';
import {
  DEFAULT_POS_PAYMENT_METHODS,
  type PosPaymentMethod,
  enabledPaymentMethodLabels,
  parsePosPaymentMethodsJson,
  paymentMethodNeedsDetail,
} from '../../core/pos-payment-methods';

export interface SaleCatalogProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  listPrice: number;
  promoPrice: number | null;
  unitPrice: number;
  stock: number;
}

function mapToSaleProduct(p: MockProduct | ApiTenantProductDto): SaleCatalogProduct {
  const promo = p.promoPrice != null && p.promoPrice > 0 ? p.promoPrice : null;
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    sku: p.sku,
    listPrice: p.price,
    promoPrice: promo,
    unitPrice: promo ?? p.price,
    stock: p.stock,
  };
}

@Component({
  selector: 'app-tenant-sales',
  imports: [FormsModule, FormatCopPipe],
  templateUrl: './tenant-sales.component.html',
  styleUrl: './tenant-sales.component.scss',
})
export class TenantSalesComponent {
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiStore = inject(ApiStoreVisitsService);
  private readonly apiSales = inject(ApiTenantSalesService);
  private readonly apiCatalog = inject(ApiTenantCatalogService);
  private readonly alerts = inject(UiAlertService);

  readonly storeVisitsRemote = signal<ApiStoreVisitDto[]>([]);
  readonly tenantSalesLive = signal<ApiTenantSaleDto[]>([]);
  readonly catalogProductsLive = signal<ApiTenantProductDto[]>([]);
  readonly savingSale = signal(false);
  readonly showHistory = signal(true);

  readonly searchQuery = signal('');
  readonly selectedProduct = signal<SaleCatalogProduct | null>(null);
  readonly quantity = signal(1);
  readonly paymentMethod = signal('Efectivo');
  readonly posPaymentMethods = signal<PosPaymentMethod[]>(
    DEFAULT_POS_PAYMENT_METHODS.map((m) => ({ ...m })),
  );

  readonly methods = computed(() => {
    const labels = enabledPaymentMethodLabels(this.posPaymentMethods());
    return labels.length ? labels : ['Efectivo'];
  });
  readonly selectedPaymentDetail = computed(() => {
    const label = this.paymentMethod();
    const method = this.posPaymentMethods().find((m) => m.label === label);
    if (!method || !paymentMethodNeedsDetail(method.id)) {
      return '';
    }
    return method.detail ?? '';
  });
  readonly salesBlockedMessage = computed(() => this.session.tenantRestrictionMessage());
  readonly canCreateSales = computed(() => !this.session.isTenantRestricted());

  readonly isSalesLiveApi = computed(
    () =>
      environment.useLiveAuth &&
      !!this.session.accessToken() &&
      this.session.isTenantUser() &&
      this.session.modules().sales,
  );

  readonly catalogProducts = computed((): SaleCatalogProduct[] => {
    const raw = this.isSalesLiveApi()
      ? this.catalogProductsLive()
      : this.session.tenantId()
        ? this.data.productsForTenant(this.session.tenantId()!)
        : [];
    return raw.map(mapToSaleProduct);
  });

  readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (q.length < 1) {
      return [];
    }
    return this.catalogProducts()
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 10);
  });

  readonly lineTotal = computed(() => {
    const p = this.selectedProduct();
    if (!p) {
      return 0;
    }
    return p.unitPrice * this.quantity();
  });

  readonly canConfirm = computed(() => {
    const p = this.selectedProduct();
    const qty = this.quantity();
    return (
      this.canCreateSales() &&
      !this.savingSale() &&
      !!p &&
      qty >= 1 &&
      qty <= p.stock &&
      p.stock > 0
    );
  });

  protected readonly environment = environment;

  constructor() {
    effect((onCleanup) => {
      if (!this.isSalesLiveApi()) {
        untracked(() => {
          this.storeVisitsRemote.set([]);
          this.tenantSalesLive.set([]);
          this.catalogProductsLive.set([]);
          const tid = this.session.tenantId();
          if (tid) {
            const branding = this.data.brandingForTenant(tid);
            this.applyPaymentMethodsFromJson(branding.posPaymentMethodsJson);
          }
        });
        return;
      }
      const sub = untracked(() =>
        this.apiStore.list().subscribe({
          next: (rows) => this.storeVisitsRemote.set(rows),
          error: () => this.storeVisitsRemote.set([]),
        }),
      );
      const subSales = untracked(() =>
        this.apiSales.list().subscribe({
          next: (rows) => this.tenantSalesLive.set(rows),
          error: () => this.tenantSalesLive.set([]),
        }),
      );
      const subCat = untracked(() =>
        this.apiCatalog.getCatalog().subscribe({
          next: (c) => {
            this.catalogProductsLive.set(c.products);
            this.applyPaymentMethodsFromJson(c.branding.posPaymentMethodsJson);
          },
          error: () => this.catalogProductsLive.set([]),
        }),
      );
      onCleanup(() => {
        sub.unsubscribe();
        subSales.unsubscribe();
        subCat.unsubscribe();
      });
    });
  }

  onSearchKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.tryAutoSelectFromSearch();
    }
  }

  tryAutoSelectFromSearch(): void {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) {
      return;
    }
    const exact = this.catalogProducts().find((p) => p.sku.toLowerCase() === q);
    if (exact) {
      this.pickProduct(exact);
      return;
    }
    const results = this.searchResults();
    if (results.length === 1) {
      this.pickProduct(results[0]);
    }
  }

  pickProduct(product: SaleCatalogProduct): void {
    this.selectedProduct.set(product);
    this.quantity.set(1);
    this.searchQuery.set('');
  }

  clearSelection(): void {
    this.selectedProduct.set(null);
    this.quantity.set(1);
    this.searchQuery.set('');
  }

  setQuantity(raw: number): void {
    const p = this.selectedProduct();
    if (!p) {
      return;
    }
    const n = Math.max(1, Math.min(p.stock, Math.floor(Number(raw) || 1)));
    this.quantity.set(n);
  }

  adjustQuantity(delta: number): void {
    this.setQuantity(this.quantity() + delta);
  }

  selectMethod(method: string): void {
    this.paymentMethod.set(method);
  }

  private applyPaymentMethodsFromJson(raw: string | undefined): void {
    const methods = parsePosPaymentMethodsJson(raw);
    this.posPaymentMethods.set(methods);
    const labels = enabledPaymentMethodLabels(methods);
    if (!labels.includes(this.paymentMethod())) {
      this.paymentMethod.set(labels[0] ?? 'Efectivo');
    }
  }

  toggleHistory(): void {
    this.showHistory.update((v) => !v);
  }

  refreshPublicLogs(): void {
    if (!this.isSalesLiveApi()) {
      return;
    }
    this.apiStore.list().subscribe({
      next: (rows) => this.storeVisitsRemote.set(rows),
      error: () => {},
    });
  }

  refreshSalesLive(): void {
    if (!this.isSalesLiveApi()) {
      return;
    }
    this.apiSales.list().subscribe({
      next: (rows) => this.tenantSalesLive.set(rows),
      error: () => {},
    });
  }

  private refreshCatalog(): void {
    if (this.isSalesLiveApi()) {
      this.apiCatalog.getCatalog().subscribe({
        next: (c) => this.catalogProductsLive.set(c.products),
        error: () => {},
      });
      return;
    }
    const p = this.selectedProduct();
    if (p) {
      const updated = this.catalogProducts().find((x) => x.id === p.id);
      if (updated) {
        this.selectedProduct.set(updated);
        if (this.quantity() > updated.stock) {
          this.quantity.set(Math.max(1, updated.stock));
        }
      }
    }
  }

  confirmSale(): void {
    if (!this.canCreateSales()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Ventas deshabilitadas.');
      return;
    }
    const product = this.selectedProduct();
    if (!product) {
      this.alerts.warning('Busca y selecciona un producto.');
      return;
    }
    const qty = this.quantity();
    if (qty < 1 || qty > product.stock) {
      this.alerts.warning(`Cantidad inválida. Stock disponible: ${product.stock}.`);
      return;
    }

    const total = product.unitPrice * qty;
    const today = new Date().toISOString().slice(0, 10);
    const method = this.paymentMethod();

    if (this.isSalesLiveApi()) {
      this.savingSale.set(true);
      this.apiSales
        .create({
          total,
          method,
          saleDate: today,
          productId: product.id,
          quantity: qty,
        })
        .pipe(finalize(() => this.savingSale.set(false)))
        .subscribe({
          next: () => {
            this.alerts.success(`Venta registrada. Se descontaron ${qty} unidad(es) del inventario.`);
            this.clearSelection();
            this.refreshSalesLive();
            this.refreshCatalog();
          },
          error: (err: { error?: { message?: string | string[] } }) => {
            const m = err?.error?.message;
            const msg = Array.isArray(m) ? m.join('. ') : m ?? 'No se pudo registrar la venta.';
            this.alerts.error(String(msg));
          },
        });
      return;
    }

    this.data.addSale(
      { date: today, total, method: method },
      { productId: product.id, stockQty: qty, tenantId: this.session.tenantId() },
    );
    this.alerts.success(
      `Venta registrada en esta sesión. Se descontaron ${qty} unidad(es) del inventario.`,
    );
    this.clearSelection();
    this.refreshCatalog();
  }
}
