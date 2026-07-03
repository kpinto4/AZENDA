import { DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  ApiPlanCatalogEntry,
  ApiPlanCatalogService,
} from '../../../core/services/api-plan-catalog.service';
import {
  ApiAdminUpgradeQuoteDto,
  ApiTenantsAdminService,
  ApiTenantAdminDto,
} from '../../../core/services/api-tenants-admin.service';

type PlanMods = { citas: boolean; ventas: boolean; inventario: boolean };

@Component({
  selector: 'app-super-tenant-billing-panel',
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    @if (loadError()) {
      <p class="billing-panel-error" role="alert">{{ loadError() }}</p>
    } @else if (loading()) {
      <p class="billing-panel-muted">Cargando catálogo de precios…</p>
    } @else {
      <ul class="billing-period-list">
        <li>Periodo: {{ formatDate(tenant().currentPeriodStart) }} — {{ formatDate(tenant().currentPeriodEnd) }}</li>
        <li>Próxima renovación: <strong>{{ formatDate(tenant().nextRenewalAt) }}</strong></li>
        <li>Quedan <strong>{{ daysRemaining() }}</strong> día(s) en el ciclo</li>
      </ul>

      <form [formGroup]="form" (ngSubmit)="save()" class="billing-panel-form">
        <div class="billing-field-row">
          <label class="billing-label" for="bp-plan-{{ tenant().id }}">Plan comercial</label>
          <select [id]="'bp-plan-' + tenant().id" class="az-select" formControlName="plan">
            @for (p of plans; track p) {
              <option [value]="p">{{ p }}</option>
            }
          </select>
        </div>

        @if (pricePreview(); as pp) {
          <p class="billing-prices-hint">
            Precios de lista (globales): mensual {{ pp.monthly | number : '1.0-0' }} · anual
            {{ pp.yearly | number : '1.0-0' }}
          </p>
        }

        <fieldset class="billing-cycle-field">
          <legend class="billing-label">Ciclo de cobro</legend>
          <div class="billing-cycle-radios">
            <label class="billing-radio-pill">
              <input type="radio" formControlName="billingCycle" value="MONTHLY" />
              <span>Mensual</span>
            </label>
            <label class="billing-radio-pill">
              <input type="radio" formControlName="billingCycle" value="YEARLY" />
              <span>Anual</span>
            </label>
          </div>
        </fieldset>

        <div class="billing-plan-functions">
          <span class="billing-label">Funciones del plan seleccionado</span>
          <p class="billing-functions-line">{{ planFunctionsLine() }}</p>
        </div>

        <label class="billing-apply-modules">
          <input type="checkbox" [checked]="applyPlanModules()" (change)="applyPlanModules.set($any($event.target).checked)" />
          Aplicar módulos por defecto del plan al guardar
        </label>

        @if (formDiffersFromSaved()) {
          <div class="billing-preview">
            <p class="billing-change-line">
              {{ tenant().plan }} ({{ cycleLabel(tenant().billingCycle) }}) →
              <strong>{{ form.controls.plan.value }}</strong>
              ({{ cycleLabel($any(form.controls.billingCycle.value)) }})
            </p>

            @if (quoteError()) {
              <p class="billing-panel-error">{{ quoteError() }}</p>
            } @else if (quoteLoading()) {
              <p class="billing-panel-muted">Calculando prorrateo…</p>
            } @else if (quote()) {
              <div class="billing-quote-grid">
                <div>
                  <span class="billing-quote-lbl">Días restantes</span>
                  <strong>{{ quote()!.period.remainingDays }} / {{ quote()!.period.totalDays }}</strong>
                </div>
                <div class="billing-quote-highlight">
                  <span class="billing-quote-lbl">Suplemento estimado (prorrateo)</span>
                  <strong>{{ quote()!.amountDueNow | number : '1.2-2' }}</strong>
                </div>
              </div>
            }
          </div>
        }

        <div class="billing-panel-actions">
          <button type="submit" class="super-ui-btn-primary" [disabled]="saving() || form.invalid || !formDiffersFromSaved()">
            {{ saving() ? 'Guardando…' : 'Guardar plan y ciclo' }}
          </button>
        </div>
      </form>

      <form [formGroup]="customForm" (ngSubmit)="saveCustomization()" class="billing-panel-form billing-custom-form">
        <h4 class="billing-custom-title">Valor personalizado</h4>
        <p class="billing-custom-hint">
          Usa esto si el negocio negoció un precio distinto (ej. plan Básico + más empleados). Los módulos se ajustan arriba con los chips.
        </p>
        <label class="billing-apply-modules">
          <input type="checkbox" formControlName="billingCustomized" />
          Activar precio personalizado para este negocio
        </label>
        @if (customForm.controls.billingCustomized.value) {
          <div class="billing-custom-grid">
            <label class="billing-field-row">
              <span class="billing-label">Cobro mensual (COP)</span>
              <input class="az-input" type="number" min="0" formControlName="planPriceMonthly" />
            </label>
            <label class="billing-field-row">
              <span class="billing-label">Cobro anual (COP)</span>
              <input class="az-input" type="number" min="0" formControlName="planPriceYearly" />
            </label>
          </div>
          <label class="billing-field-row">
            <span class="billing-label">Notas de personalización</span>
            <textarea class="az-input" rows="3" formControlName="billingNotes" placeholder="Ej. Básico + 3 empleados extra · incluye ventas"></textarea>
          </label>
        }
        <div class="billing-panel-actions billing-panel-actions--split">
          <button
            type="button"
            class="super-ui-btn-ghost"
            [disabled]="saving() || !tenant().billingCustomized"
            (click)="resetToCatalog()"
          >
            Volver a precio del catálogo
          </button>
          <button type="submit" class="super-ui-btn-primary" [disabled]="saving() || customForm.invalid || !customFormDiffers()">
            {{ saving() ? 'Guardando…' : 'Guardar valor personalizado' }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 0.85rem 1.15rem 1rem;
      background: color-mix(in srgb, var(--az-bg) 50%, var(--az-surface));
      border-top: 1px solid var(--az-border);
    }

    .billing-period-list {
      margin: 0 0 0.85rem;
      padding-left: 1.1rem;
      font-size: 0.82rem;
      line-height: 1.55;
      color: var(--az-muted);
    }

    .billing-panel-form {
      display: grid;
      gap: 0.75rem;
    }

    .billing-field-row {
      display: grid;
      gap: 0.35rem;
    }

    .billing-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--az-muted);
    }

    .billing-prices-hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--az-muted);
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--az-primary) 6%, var(--az-surface));
      border: 1px solid var(--az-border);
    }

    .billing-cycle-field {
      border: none;
      padding: 0;
      margin: 0;
    }

    .billing-cycle-radios {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.35rem;
    }

    .billing-radio-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--az-border);
      border-radius: 999px;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .billing-radio-pill:has(input:checked) {
      border-color: var(--az-primary);
      background: color-mix(in srgb, var(--az-primary) 10%, var(--az-surface));
      color: var(--az-primary);
      font-weight: 600;
    }

    .billing-apply-modules {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      color: var(--az-muted);
      cursor: pointer;
    }

    .billing-preview {
      padding: 0.75rem;
      border-radius: 10px;
      border: 1px dashed var(--az-border);
      background: var(--az-surface);
    }

    .billing-change-line {
      margin: 0 0 0.5rem;
      font-size: 0.85rem;
    }

    .billing-quote-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.5rem;
      font-size: 0.82rem;
    }

    .billing-quote-lbl {
      display: block;
      font-size: 0.68rem;
      color: var(--az-muted);
      margin-bottom: 0.1rem;
    }

    .billing-quote-highlight {
      grid-column: 1 / -1;
      padding: 0.45rem 0.6rem;
      border-radius: 8px;
      background: color-mix(in srgb, var(--az-primary) 10%, var(--az-surface));
    }

    .billing-panel-actions {
      display: flex;
      justify-content: flex-end;
    }

    .billing-panel-actions--split {
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .billing-plan-functions {
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      background: var(--az-surface);
      border: 1px solid var(--az-border);
    }

    .billing-functions-line {
      margin: 0.35rem 0 0;
      font-size: 0.82rem;
      line-height: 1.45;
      color: var(--az-text);
    }

    .billing-custom-form {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px dashed var(--az-border);
    }

    .billing-custom-title {
      margin: 0 0 0.35rem;
      font-size: 0.92rem;
    }

    .billing-custom-hint {
      margin: 0 0 0.75rem;
      font-size: 0.8rem;
      color: var(--az-muted);
      line-height: 1.45;
    }

    .billing-custom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }

    @media (max-width: 520px) {
      .billing-custom-grid {
        grid-template-columns: 1fr;
      }
    }

    textarea.az-input {
      min-height: 4.5rem;
      resize: vertical;
    }

    .billing-panel-error {
      margin: 0;
      color: var(--az-danger);
      font-size: 0.85rem;
    }

    .billing-panel-muted {
      margin: 0;
      font-size: 0.85rem;
      color: var(--az-muted);
    }
  `,
})
export class SuperTenantBillingPanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiTenantsAdminService);
  private readonly planCatalog = inject(ApiPlanCatalogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tenant = input.required<ApiTenantAdminDto>();
  readonly saved = output<ApiTenantAdminDto>();

  readonly plans = ['Trial', 'Básico', 'Pro', 'Negocio'];
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly catalog = signal<ApiPlanCatalogEntry[]>([]);
  readonly pricePreview = signal<{ monthly: number; yearly: number } | null>(null);
  readonly quoteLoading = signal(false);
  readonly quote = signal<ApiAdminUpgradeQuoteDto | null>(null);
  readonly quoteError = signal('');
  readonly applyPlanModules = signal(true);

  readonly form = this.fb.nonNullable.group({
    plan: ['Trial', Validators.required],
    billingCycle: this.fb.nonNullable.control<'MONTHLY' | 'YEARLY'>('MONTHLY', {
      validators: [Validators.required],
    }),
  });

  readonly customForm = this.fb.nonNullable.group({
    billingCustomized: false,
    planPriceMonthly: [0, [Validators.min(0)]],
    planPriceYearly: [0, [Validators.min(0)]],
    billingNotes: [''],
  });

  constructor() {
    this.planCatalog.list().subscribe({
      next: (entries) => {
        this.catalog.set(entries);
        this.loading.set(false);
        this.syncFormFromTenant();
        this.updatePricePreview();
      },
      error: () => {
        this.loadError.set('No se pudo cargar el catálogo de precios.');
        this.loading.set(false);
      },
    });

    this.form.controls.plan.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updatePricePreview());

    this.form.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.maybeFetchQuote());

    effect(() => {
      const t = this.tenant();
      if (!this.loading()) {
        this.syncFormFromTenant();
        this.updatePricePreview();
        this.maybeFetchQuote();
      }
      void t.id;
    });
  }

  daysRemaining(): number {
    const t = this.tenant();
    const end = new Date(t.currentPeriodEnd).getTime();
    if (Number.isNaN(end)) {
      return 0;
    }
    return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  formDiffersFromSaved(): boolean {
    const t = this.tenant();
    const v = this.form.getRawValue();
    return v.plan !== t.plan || v.billingCycle !== t.billingCycle;
  }

  cycleLabel(c: 'MONTHLY' | 'YEARLY'): string {
    return c === 'YEARLY' ? 'Anual' : 'Mensual';
  }

  formatDate(value: string): string {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  }

  planFunctionsLine(): string {
    const plan = this.form.controls.plan.getRawValue();
    const mods = this.planDefaults(plan);
    const parts: string[] = [];
    if (mods.citas) parts.push('citas');
    if (mods.ventas) parts.push('ventas');
    if (mods.inventario) parts.push('inventario');
    const catalog = this.pricePreview();
    const priceHint =
      catalog && catalog.monthly > 0
        ? ` · lista ${catalog.monthly.toLocaleString('es-CO')} COP/mes`
        : '';
    return `${plan}: ${parts.join(' + ') || 'sin módulos'}${priceHint}`;
  }

  customFormDiffers(): boolean {
    const t = this.tenant();
    const v = this.customForm.getRawValue();
    return (
      v.billingCustomized !== !!t.billingCustomized ||
      v.planPriceMonthly !== t.planPriceMonthly ||
      v.planPriceYearly !== t.planPriceYearly ||
      (v.billingNotes ?? '') !== (t.billingNotes ?? '')
    );
  }

  saveCustomization(): void {
    if (this.customForm.invalid || !this.customFormDiffers()) {
      return;
    }
    const t = this.tenant();
    const v = this.customForm.getRawValue();
    this.saving.set(true);
    this.loadError.set('');
    this.api
      .patch(t.id, {
        billingCustomized: v.billingCustomized,
        planPriceMonthly: v.planPriceMonthly,
        planPriceYearly: v.planPriceYearly,
        billingNotes: v.billingNotes.trim(),
      })
      .subscribe({
        next: (row) => {
          this.saving.set(false);
          this.saved.emit(row);
        },
        error: () => {
          this.saving.set(false);
          this.loadError.set('No se pudo guardar la personalización.');
        },
      });
  }

  resetToCatalog(): void {
    const t = this.tenant();
    this.saving.set(true);
    this.loadError.set('');
    this.api
      .patch(t.id, {
        billingCustomized: false,
        billingNotes: '',
      })
      .subscribe({
        next: (row) => {
          this.saving.set(false);
          this.syncCustomFormFromTenant(row);
          this.saved.emit(row);
        },
        error: () => {
          this.saving.set(false);
          this.loadError.set('No se pudo restaurar el precio del catálogo.');
        },
      });
  }

  save(): void {
    if (this.form.invalid || !this.formDiffersFromSaved()) {
      return;
    }
    const t = this.tenant();
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.loadError.set('');

    const patch: Parameters<ApiTenantsAdminService['patch']>[1] = {
      plan: v.plan,
      billingCycle: v.billingCycle,
    };
    if (this.applyPlanModules()) {
      const mods = this.planDefaults(v.plan);
      patch.citas = mods.citas;
      patch.ventas = mods.ventas;
      patch.inventario = mods.inventario;
    }

    this.api.patch(t.id, patch).subscribe({
      next: (row) => {
        this.saving.set(false);
        this.saved.emit(row);
      },
      error: () => {
        this.saving.set(false);
        this.loadError.set('No se pudo guardar. Revisa conexión y permisos.');
      },
    });
  }

  private syncFormFromTenant(): void {
    const t = this.tenant();
    this.form.patchValue(
      { plan: t.plan, billingCycle: t.billingCycle },
      { emitEvent: false },
    );
    this.syncCustomFormFromTenant(t);
    this.quote.set(null);
    this.quoteError.set('');
  }

  private syncCustomFormFromTenant(t: ApiTenantAdminDto): void {
    this.customForm.patchValue(
      {
        billingCustomized: !!t.billingCustomized,
        planPriceMonthly: t.planPriceMonthly,
        planPriceYearly: t.planPriceYearly,
        billingNotes: t.billingNotes ?? '',
      },
      { emitEvent: false },
    );
  }

  private updatePricePreview(): void {
    const plan = this.form.controls.plan.getRawValue();
    const e = this.catalog().find((c) => c.planKey === plan);
    this.pricePreview.set(
      e ? { monthly: e.priceMonthly, yearly: e.priceYearly } : null,
    );
  }

  private maybeFetchQuote(): void {
    const t = this.tenant();
    if (this.loading()) {
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
    this.api.upgradeQuote(t.id, { targetPlan: v.plan, targetCycle: v.billingCycle }).subscribe({
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

  private planDefaults(plan: string): PlanMods {
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
}
