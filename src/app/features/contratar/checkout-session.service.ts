import { Injectable, signal } from '@angular/core';
import { normalizeBillingCycle } from '../../core/config/billing.config';
import { CommercialPlanKey } from './checkout.config';
import { asCommercialPlan } from './checkout-plan.util';

export type CheckoutBillingCycle = 'MONTHLY' | 'YEARLY';

export interface CheckoutSessionState {
  email: string;
  selectedPlan: CommercialPlanKey | null;
  billingCycle: CheckoutBillingCycle;
  business: string;
  accountCreated: boolean;
}

const STORAGE_KEY = 'azenda.checkout.session.v1';

const EMPTY: CheckoutSessionState = {
  email: '',
  selectedPlan: null,
  billingCycle: 'MONTHLY',
  business: '',
  accountCreated: false,
};

@Injectable({ providedIn: 'root' })
export class CheckoutSessionService {
  readonly email = signal('');
  readonly selectedPlan = signal<CommercialPlanKey | null>(null);
  readonly billingCycle = signal<CheckoutBillingCycle>('MONTHLY');
  readonly business = signal('');
  readonly accountCreated = signal(false);

  constructor() {
    this.load();
  }

  setEmail(email: string): void {
    const v = email.trim().toLowerCase();
    this.email.set(v);
    this.persist();
  }

  setPlan(plan: CommercialPlanKey, cycle: CheckoutBillingCycle = 'MONTHLY'): void {
    this.selectedPlan.set(plan);
    this.billingCycle.set(normalizeBillingCycle(cycle));
    this.persist();
  }

  setBusiness(name: string): void {
    this.business.set(name.trim());
    this.persist();
  }

  markAccountCreated(): void {
    this.accountCreated.set(true);
    this.persist();
  }

  reset(): void {
    this.email.set('');
    this.selectedPlan.set(null);
    this.billingCycle.set('MONTHLY');
    this.business.set('');
    this.accountCreated.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  hasEmail(): boolean {
    return this.email().includes('@');
  }

  hasPlan(): boolean {
    return !!this.selectedPlan();
  }

  isReadyForAccount(): boolean {
    return this.hasEmail() && this.hasPlan();
  }

  canShowConfirmation(): boolean {
    return this.accountCreated() && this.hasEmail() && this.hasPlan();
  }

  /**
   * Rellena la sesión de checkout tras registro o login con tenant PAUSED,
   * para que confirmación muestre plan y datos sin repetir pasos.
   */
  syncPendingRegistration(params: {
    email: string;
    plan: string;
    business?: string;
    accountCreated?: boolean;
  }): void {
    const commercial = asCommercialPlan(params.plan);
    if (params.email.includes('@')) {
      this.email.set(params.email.trim().toLowerCase());
    }
    if (commercial) {
      this.selectedPlan.set(commercial);
      this.billingCycle.set('MONTHLY');
    }
    if (params.business?.trim()) {
      this.business.set(params.business.trim());
    }
    if (params.accountCreated !== false) {
      this.accountCreated.set(true);
    }
    this.persist();
  }

  /** Punto de entrada único para «Crear cuenta» / registro. */
  resolveRegisterEntryUrl(): string {
    if (this.canShowConfirmation()) {
      return '/contratar/confirmacion';
    }
    if (this.accountCreated() && this.hasPlan()) {
      return '/contratar/pago';
    }
    if (this.isReadyForAccount()) {
      return '/contratar/cuenta';
    }
    if (this.hasEmail()) {
      return '/contratar/planes/elegir';
    }
    return '/contratar';
  }

  applyPlanFromQuery(planParam: string | null | undefined): boolean {
    const plan = asCommercialPlan(planParam);
    if (!plan) {
      return false;
    }
    this.setPlan(plan, 'MONTHLY');
    return true;
  }

  private load(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<CheckoutSessionState>;
      if (typeof parsed.email === 'string') {
        this.email.set(parsed.email);
      }
      if (
        parsed.selectedPlan === 'Básico' ||
        parsed.selectedPlan === 'Pro' ||
        parsed.selectedPlan === 'Negocio'
      ) {
        this.selectedPlan.set(parsed.selectedPlan);
      }
      if (parsed.billingCycle === 'YEARLY' || parsed.billingCycle === 'MONTHLY') {
        this.billingCycle.set(normalizeBillingCycle(parsed.billingCycle));
      }
      if (typeof parsed.business === 'string') {
        this.business.set(parsed.business);
      }
      this.accountCreated.set(!!parsed.accountCreated);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const state: CheckoutSessionState = {
      email: this.email(),
      selectedPlan: this.selectedPlan(),
      billingCycle: this.billingCycle(),
      business: this.business(),
      accountCreated: this.accountCreated(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
