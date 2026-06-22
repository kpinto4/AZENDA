import { Injectable, signal } from '@angular/core';
import { CommercialPlanKey } from './checkout.config';

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
    this.billingCycle.set(cycle);
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
      if (parsed.billingCycle === 'YEARLY') {
        this.billingCycle.set('YEARLY');
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
