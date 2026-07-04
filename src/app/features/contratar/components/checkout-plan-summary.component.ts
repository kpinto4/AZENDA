import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { retry, timer } from 'rxjs';
import { formatCop } from '../../../core/format-currency';
import { ApiPlanCatalogService } from '../../../core/services/api-plan-catalog.service';
import {
  DEFAULT_PUBLIC_PLAN_PRICES,
  mapPublicPlanCatalogPrices,
  PublicCommercialPlanKey,
} from '../../../core/services/public-plan-prices.util';
import { CommercialPlanKey } from '../checkout.config';
import { CheckoutSessionService } from '../checkout-session.service';

@Component({
  selector: 'app-checkout-plan-summary',
  template: `
    <div class="checkout-summary checkout-plan-summary" role="status" aria-label="Plan elegido">
      <p class="checkout-plan-summary-label">Plan elegido</p>
      <p class="checkout-plan-summary-plan">
        <strong>{{ planLabel() }}</strong>
        @if (priceMonthly() > 0) {
          <span class="checkout-plan-summary-price">{{ formatCop(priceMonthly()) }}/mes</span>
        }
      </p>
      @if (email()) {
        <p class="checkout-plan-summary-meta">{{ email() }}</p>
      }
      @if (business()) {
        <p class="checkout-plan-summary-meta">{{ business() }}</p>
      }
    </div>
  `,
  styleUrl: '../checkout-shell.component.scss',
})
export class CheckoutPlanSummaryComponent implements OnInit {
  private readonly planCatalogApi = inject(ApiPlanCatalogService);
  private readonly checkout = inject(CheckoutSessionService);

  /** Si no se pasa, usa el plan de la sesión de checkout. */
  readonly plan = input<CommercialPlanKey | string | null>(null);
  readonly showEmail = input(true);
  readonly showBusiness = input(true);

  readonly formatCop = formatCop;
  readonly priceMonthly = signal(0);

  readonly planLabel = computed(() => {
    const p = this.plan() ?? this.checkout.selectedPlan();
    return p?.trim() || '—';
  });

  readonly email = computed(() =>
    this.showEmail() ? this.checkout.email() : '',
  );

  readonly business = computed(() =>
    this.showBusiness() ? this.checkout.business() : '',
  );

  ngOnInit(): void {
    const planKey = (this.plan() ?? this.checkout.selectedPlan()) as CommercialPlanKey | null;
    if (!planKey) {
      return;
    }
    const fallback =
      DEFAULT_PUBLIC_PLAN_PRICES[planKey as PublicCommercialPlanKey]?.monthly ?? 0;
    this.priceMonthly.set(fallback);
    this.planCatalogApi
      .getPublic()
      .pipe(retry({ count: 2, delay: () => timer(800) }))
      .subscribe({
        next: (entries) => {
          const map = mapPublicPlanCatalogPrices(entries);
          const row = map[planKey];
          this.priceMonthly.set(row?.monthly ?? fallback);
        },
        error: () => this.priceMonthly.set(fallback),
      });
  }
}
