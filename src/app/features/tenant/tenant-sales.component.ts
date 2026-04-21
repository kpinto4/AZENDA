import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiStoreVisitDto, ApiStoreVisitsService } from '../../core/services/api-store-visits.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

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

  readonly storeVisitsRemote = signal<ApiStoreVisitDto[]>([]);

  readonly tenantProducts = computed(() => {
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

  protected readonly environment = environment;

  constructor() {
    effect((onCleanup) => {
      const live =
        environment.useLiveAuth &&
        !!this.session.accessToken() &&
        this.session.isTenantUser() &&
        this.session.modules().sales;
      if (!live) {
        untracked(() => this.storeVisitsRemote.set([]));
        return;
      }
      const sub = untracked(() =>
        this.apiStore.list().subscribe({
          next: (rows) => this.storeVisitsRemote.set(rows),
          error: () => this.storeVisitsRemote.set([]),
        }),
      );
      onCleanup(() => sub.unsubscribe());
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
      pid
        ? {
            productId: pid,
            stockQty: Number(v.stockQty) || 1,
            tenantId: this.session.tenantId(),
          }
        : undefined,
    );
  }
}
