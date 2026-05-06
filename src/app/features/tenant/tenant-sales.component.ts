import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { UiAlertService } from '../../core/services/ui-alert.service';

@Component({
  selector: 'app-tenant-sales',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-sales.component.html',
  styleUrl: './tenant-sales.component.scss',
})
export class TenantSalesComponent {
  private readonly fb = inject(FormBuilder);
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

  readonly isSalesLiveApi = computed(
    () =>
      environment.useLiveAuth &&
      !!this.session.accessToken() &&
      this.session.isTenantUser() &&
      this.session.modules().sales,
  );

  readonly tenantProducts = computed((): (MockProduct | ApiTenantProductDto)[] => {
    if (this.isSalesLiveApi()) {
      return this.catalogProductsLive();
    }
    const tid = this.session.tenantId();
    return tid ? this.data.productsForTenant(tid) : [];
  });

  readonly form = this.fb.nonNullable.group({
    total: [12, [Validators.required, Validators.min(1)]],
    method: ['Tarjeta', Validators.required],
    linked: [''],
    productId: [''],
    stockQty: [1, [Validators.min(1)]],
  });

  readonly methods = ['Efectivo', 'Tarjeta', 'Bizum', 'Transferencia'];
  readonly salesBlockedMessage = computed(() => this.session.tenantRestrictionMessage());
  readonly canCreateSales = computed(() => !this.session.isTenantRestricted());

  protected readonly environment = environment;

  constructor() {
    effect(() => {
      if (this.canCreateSales()) {
        this.form.enable({ emitEvent: false });
      } else {
        this.form.disable({ emitEvent: false });
      }
    });
    effect((onCleanup) => {
      if (!this.isSalesLiveApi()) {
        untracked(() => {
          this.storeVisitsRemote.set([]);
          this.tenantSalesLive.set([]);
          this.catalogProductsLive.set([]);
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
          next: (c) => this.catalogProductsLive.set(c.products),
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

  refreshPublicLogs(): void {
    if (
      !environment.useLiveAuth ||
      !this.session.accessToken() ||
      !this.session.isTenantUser() ||
      !this.session.modules().sales
    ) {
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

  add(): void {
    if (!this.canCreateSales()) {
      this.alerts.warning(this.session.tenantRestrictionMessage() ?? 'Ventas deshabilitadas.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const today = new Date().toISOString().slice(0, 10);
    const pid = v.productId?.trim() || undefined;
    const qty = Number(v.stockQty) || 1;
    const linked = v.linked?.trim() || undefined;

    if (this.isSalesLiveApi()) {
      this.savingSale.set(true);
      this.apiSales
        .create({
          total: Number(v.total),
          method: v.method,
          saleDate: today,
          linkedAppointmentId: linked,
          productId: pid,
          quantity: pid ? qty : undefined,
        })
        .pipe(finalize(() => this.savingSale.set(false)))
        .subscribe({
          next: () => {
            this.alerts.success('Venta registrada correctamente.');
            this.refreshSalesLive();
            this.apiCatalog.getCatalog().subscribe({
              next: (c) => this.catalogProductsLive.set(c.products),
              error: () => {},
            });
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
      {
        date: today,
        total: Number(v.total),
        method: v.method,
        linkedAppointment: linked,
      },
      pid
        ? {
            productId: pid,
            stockQty: qty,
            tenantId: this.session.tenantId(),
          }
        : undefined,
    );
    this.alerts.success('Venta registrada correctamente.');
  }
}
