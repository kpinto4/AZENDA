import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { retry, timer } from 'rxjs';
import { formatCop } from '../../../core/format-currency';
import { ApiPlanCatalogService } from '../../../core/services/api-plan-catalog.service';
import {
  mapPublicPlanCatalogPrices,
  PublicPlanPriceRow,
} from '../../../core/services/public-plan-prices.util';
import {
  CHECKOUT_PLANS,
  CommercialPlanKey,
  PlanCheckoutMeta,
} from '../checkout.config';
import { CheckoutSessionService } from '../checkout-session.service';

const EMPTY_PRICES: Record<CommercialPlanKey, PublicPlanPriceRow> = {
  Básico: { monthly: 0, yearly: 0 },
  Pro: { monthly: 0, yearly: 0 },
  Negocio: { monthly: 0, yearly: 0 },
};

@Component({
  selector: 'app-checkout-plan-select-step',
  template: `
    <section class="checkout-panel checkout-panel--plan-select">
      <div class="checkout-panel-inner" style="max-width: 960px; width: 100%;">
        <p class="checkout-kicker">
          <span class="checkout-kicker-icon" aria-hidden="true">✓</span>
          Paso <strong>2</strong> de <strong>3</strong> · Plan
        </p>
        <h1>Selecciona el plan ideal para ti</h1>
        <p class="checkout-note">Correo: {{ checkout.email() }}</p>

        @if (loadError()) {
          <p class="checkout-error" role="alert">{{ loadError() }}</p>
        }

        <div class="checkout-plans-grid">
          @for (plan of plansWithPrices(); track plan.key) {
            <button
              type="button"
              class="checkout-plan-card"
              [class.selected]="selected() === plan.key"
              [class.popular]="plan.popular"
              [disabled]="!pricesReady()"
              (click)="select(plan.key)"
            >
              @if (plan.popular) {
                <span class="checkout-plan-ribbon">Más popular</span>
              }
              <div class="checkout-plan-head">
                <h3>{{ plan.key }}</h3>
                <p>{{ plan.tagline }}</p>
              </div>
              <div class="checkout-plan-body">
                @for (row of plan.features; track row.label) {
                  <div class="checkout-plan-row">
                    <span>{{ row.label }}</span>
                    <strong>{{ row.value }}</strong>
                  </div>
                }
                <p class="checkout-plan-price">
                  @if (pricesReady()) {
                    {{ formatCop(planPrice(plan.key)) }}<span style="font-size:0.75rem;font-weight:500">/mes</span>
                  } @else {
                    <span class="muted">Cargando precio…</span>
                  }
                </p>
              </div>
            </button>
          }
        </div>
      </div>

      <div class="checkout-sticky-bar" role="region" aria-label="Continuar con el plan">
        <div class="checkout-sticky-bar-inner">
          @if (selected(); as planKey) {
            <div class="checkout-sticky-summary">
              <span class="checkout-sticky-label">Plan seleccionado</span>
              <strong>{{ planKey }}</strong>
              @if (pricesReady()) {
                <span class="checkout-sticky-price">{{ formatCop(planPrice(planKey)) }}/mes</span>
              }
            </div>
          } @else {
            <p class="checkout-sticky-hint">Elige un plan para continuar</p>
          }
          <button
            type="button"
            class="az-btn az-btn-primary checkout-sticky-btn"
            [disabled]="!selected() || !pricesReady()"
            (click)="continue()"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutPlanSelectStepComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly planCatalogApi = inject(ApiPlanCatalogService);
  readonly checkout = inject(CheckoutSessionService);

  readonly formatCop = formatCop;
  readonly selected = signal<CommercialPlanKey | null>(this.checkout.selectedPlan());
  readonly pricesReady = signal(false);
  readonly loadError = signal('');

  private readonly prices = signal<Record<CommercialPlanKey, PublicPlanPriceRow>>(
    EMPTY_PRICES,
  );

  readonly plansWithPrices = computed(() => {
    const map = this.prices();
    return CHECKOUT_PLANS.map((plan) => this.withPriceFeature(plan, map));
  });

  ngOnInit(): void {
    this.planCatalogApi
      .getPublic()
      .pipe(
        retry({
          count: 2,
          delay: () => timer(1200),
        }),
      )
      .subscribe({
        next: (entries) => {
          this.prices.set(mapPublicPlanCatalogPrices(entries));
          this.pricesReady.set(true);
          this.loadError.set('');
        },
        error: () => {
          this.loadError.set(
            'No se pudieron cargar los precios desde el servidor. Revisa que el API esté activo.',
          );
          this.pricesReady.set(false);
        },
      });
  }

  planPrice(key: CommercialPlanKey): number {
    return this.prices()[key].monthly;
  }

  select(plan: CommercialPlanKey): void {
    this.selected.set(plan);
    this.checkout.setPlan(plan, 'MONTHLY');
  }

  continue(): void {
    const plan = this.selected();
    if (!plan || !this.pricesReady()) {
      return;
    }
    this.checkout.setPlan(plan, 'MONTHLY');
    void this.router.navigateByUrl('/contratar/cuenta');
  }

  private withPriceFeature(
    plan: PlanCheckoutMeta,
    map: Record<CommercialPlanKey, PublicPlanPriceRow>,
  ): PlanCheckoutMeta {
    const price = map[plan.key].monthly;
    return {
      ...plan,
      features: plan.features.map((f) =>
        f.label === 'Precio mensual'
          ? { ...f, value: price > 0 ? formatCop(price) : '—' }
          : f,
      ),
    };
  }
}
