import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import {
  ApiPlanCatalogEntry,
  ApiPlanCatalogService,
} from '../../../../core/services/api-plan-catalog.service';
import {
  ApiAdminUpgradeQuoteDto,
  ApiTenantsAdminService,
  ApiTenantAdminDto,
} from '../../../../core/services/api-tenants-admin.service';
import { MockDataService } from '../../../../core/services/mock-data.service';
import { environment } from '../../../../../environments/environment';

type PlanMods = { citas: boolean; ventas: boolean; inventario: boolean };

@Component({
  selector: 'app-super-tenant-plan',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  templateUrl: './super-tenant-plan.page.html',
  styleUrl: './super-tenant-plan.page.scss',
})
export class SuperTenantPlanPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiTenantsAdminService);
  private readonly planCatalog = inject(ApiPlanCatalogService);
  private readonly data = inject(MockDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly plans = ['Trial', 'Básico', 'Pro', 'Negocio'];
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly tenant = signal<ApiTenantAdminDto | null>(null);
  readonly catalog = signal<ApiPlanCatalogEntry[]>([]);
  readonly pricePreview = signal<{ monthly: number; yearly: number } | null>(null);

  readonly quoteLoading = signal(false);
  readonly quote = signal<ApiAdminUpgradeQuoteDto | null>(null);
  readonly quoteError = signal('');

  private tenantRouteId = '';

  readonly form = this.fb.nonNullable.group({
    plan: ['Trial', Validators.required],
    billingCycle: this.fb.nonNullable.control<'MONTHLY' | 'YEARLY'>('MONTHLY', {
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.form.controls.plan.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updatePricePreview());

    this.form.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(
          (a, b) => JSON.stringify(a) === JSON.stringify(b),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.maybeFetchQuote());

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        const id = pm.get('tenantId');
        if (!id) {
          this.error.set('Falta el identificador del tenant.');
          this.loading.set(false);
          return;
        }
        if (!environment.useLiveAuth) {
          this.error.set('Este panel solo está disponible con API en vivo.');
          this.loading.set(false);
          return;
        }
        this.tenantRouteId = id;
        this.load(id);
      });
  }

  formDiffersFromSaved(): boolean {
    const t = this.tenant();
    if (!t) {
      return false;
    }
    const v = this.form.getRawValue();
    return v.plan !== t.plan || v.billingCycle !== t.billingCycle;
  }

  planDefaults(plan: string): PlanMods {
    switch (plan) {
      case 'Trial':
        return { citas: true, ventas: false, inventario: false };
      case 'Básico':
        return { citas: true, ventas: true, inventario: false };
      case 'Pro':
      case 'Negocio':
        return { citas: true, ventas: true, inventario: true };
      default:
        return { citas: true, ventas: true, inventario: false };
    }
  }

  /** Capacidades que el plan objetivo habilita por defecto y que hoy el negocio no tiene activadas. */
  newCapabilityLines(t: ApiTenantAdminDto, targetPlan: string): string[] {
    const tgt = this.planDefaults(targetPlan);
    const cur = t.modules;
    const lines: string[] = [];
    if (tgt.citas && !cur.citas) {
      lines.push('Citas en el panel del negocio');
    }
    if (tgt.ventas && !cur.ventas) {
      lines.push('Ventas / TPV');
    }
    if (tgt.inventario && !cur.inventario) {
      lines.push('Inventario y catálogo interno');
    }
    const targetProTier = targetPlan === 'Pro' || targetPlan === 'Negocio';
    const currentProTier = t.plan === 'Pro' || t.plan === 'Negocio';
    if (targetProTier && !currentProTier) {
      lines.push(
        'Tier Pro o Negocio: habilita catálogo público cuando ventas e inventario estén activos (ajústalos en Tenants si aplica).',
      );
    }
    return lines;
  }

  cycleLabel(c: 'MONTHLY' | 'YEARLY'): string {
    return c === 'YEARLY' ? 'Anual' : 'Mensual';
  }

  formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return d.toLocaleDateString();
  }

  daysRemaining(t: ApiTenantAdminDto): number {
    const end = new Date(t.currentPeriodEnd).getTime();
    if (Number.isNaN(end)) {
      return 0;
    }
    const ms = end - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  refreshQuoteNow(): void {
    this.maybeFetchQuote();
  }

  save(): void {
    const id = this.tenant()?.id;
    if (!id || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.api
      .patch(id, {
        plan: v.plan,
        billingCycle: v.billingCycle,
      })
      .subscribe({
        next: (row) => {
          this.tenant.set(row);
          this.data.syncTenantsFromApi([row]);
          this.saving.set(false);
          void this.router.navigate(['/super/tenants']);
        },
        error: () => {
          this.saving.set(false);
          this.error.set('No se pudo guardar. Revisa conexión y permisos.');
        },
      });
  }

  cancel(): void {
    void this.router.navigate(['/super/tenants']);
  }

  private updatePricePreview(): void {
    const plan = this.form.controls.plan.getRawValue();
    const e = this.catalog().find((c) => c.planKey === plan);
    this.pricePreview.set(
      e ? { monthly: e.priceMonthly, yearly: e.priceYearly } : null,
    );
  }

  private maybeFetchQuote(): void {
    const id = this.tenantRouteId;
    const t = this.tenant();
    if (!id || !t || this.loading()) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.plan === t.plan && v.billingCycle === t.billingCycle) {
      this.quote.set(null);
      this.quoteError.set('');
      this.quoteLoading.set(false);
      return;
    }
    this.quoteLoading.set(true);
    this.quoteError.set('');
    this.api.upgradeQuote(id, { targetPlan: v.plan, targetCycle: v.billingCycle }).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.quoteLoading.set(false);
      },
      error: () => {
        this.quote.set(null);
        this.quoteError.set('No se pudo simular el prorrateo.');
        this.quoteLoading.set(false);
      },
    });
  }

  private load(tenantId: string): void {
    this.loading.set(true);
    this.error.set('');
    this.tenant.set(null);
    this.quote.set(null);
    this.quoteError.set('');
    forkJoin({
      tenant: this.api.getById(tenantId),
      catalog: this.planCatalog.list(),
    }).subscribe({
      next: ({ tenant, catalog }) => {
        this.tenant.set(tenant);
        this.catalog.set(catalog);
        this.form.patchValue({
          plan: tenant.plan,
          billingCycle: tenant.billingCycle,
        });
        this.updatePricePreview();
        this.loading.set(false);
        this.maybeFetchQuote();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Tenant no encontrado o sin acceso.');
      },
    });
  }
}
