import { Injectable } from '@nestjs/common';
import { BillingCycle, TenantBillingSnapshot } from './sql-db.types';
import { TenantRepository } from './repositories/tenant.repository';

/** Cálculos de periodo facturable y cotización de cambio de plan (sin escritura SQL). */
@Injectable()
export class TenantBillingService {
  constructor(private readonly tenants: TenantRepository) {}

  private round2(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  async getTenantBillingSnapshot(
    tenantId: string,
  ): Promise<TenantBillingSnapshot | undefined> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) {
      return undefined;
    }
    const currentPeriodStart = tenant.currentPeriodStart;
    const currentPeriodEnd = tenant.currentPeriodEnd;
    const msTotal = Math.max(
      0,
      new Date(currentPeriodEnd).getTime() -
        new Date(currentPeriodStart).getTime(),
    );
    const nowMs = Date.now();
    const elapsedMs = Math.max(
      0,
      Math.min(msTotal, nowMs - new Date(currentPeriodStart).getTime()),
    );
    const daysTotal = Math.max(1, Math.ceil(msTotal / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.min(
      daysTotal,
      Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24))),
    );
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);
    const progressPct = Math.max(
      0,
      Math.min(100, Number(((daysElapsed / daysTotal) * 100).toFixed(2))),
    );

    return {
      cycle: tenant.billingCycle,
      currentPeriodStart,
      currentPeriodEnd,
      nextRenewalAt: tenant.nextRenewalAt,
      monthlyPrice: tenant.planPriceMonthly,
      yearlyPrice: tenant.planPriceYearly,
      daysTotal,
      daysElapsed,
      daysRemaining,
      progressPct,
    };
  }

  async getUpgradeQuote(params: {
    tenantId: string;
    targetPlan: string;
    targetCycle: BillingCycle;
  }): Promise<
    | {
        tenantId: string;
        currentPlan: string;
        targetPlan: string;
        currentCycle: BillingCycle;
        targetCycle: BillingCycle;
        period: {
          start: string;
          end: string;
          totalDays: number;
          remainingDays: number;
        };
        creditAmount: number;
        targetCostForRemaining: number;
        amountDueNow: number;
        carryOverBalance: number;
      }
    | undefined
  > {
    const tenant = await this.tenants.findById(params.tenantId);
    if (!tenant) {
      return undefined;
    }
    const snapshot = await this.getTenantBillingSnapshot(params.tenantId);
    if (!snapshot) {
      return undefined;
    }
    const currentPrices = await this.tenants.getPlanCatalogPrices(tenant.plan);
    const targetPrices = await this.tenants.getPlanCatalogPrices(
      params.targetPlan,
    );
    const currentCyclePrice =
      tenant.billingCycle === 'YEARLY'
        ? currentPrices.yearly
        : currentPrices.monthly;
    const targetCyclePrice =
      params.targetCycle === 'YEARLY'
        ? targetPrices.yearly
        : targetPrices.monthly;

    const ratioRemaining =
      snapshot.daysTotal > 0 ? snapshot.daysRemaining / snapshot.daysTotal : 0;
    const creditAmount = this.round2(currentCyclePrice * ratioRemaining);
    const targetCostForRemaining = this.round2(
      targetCyclePrice * ratioRemaining,
    );
    const rawDue = this.round2(targetCostForRemaining - creditAmount);
    const amountDueNow = rawDue > 0 ? rawDue : 0;
    const carryOverBalance = rawDue < 0 ? this.round2(Math.abs(rawDue)) : 0;

    return {
      tenantId: params.tenantId,
      currentPlan: tenant.plan,
      targetPlan: params.targetPlan,
      currentCycle: tenant.billingCycle,
      targetCycle: params.targetCycle,
      period: {
        start: snapshot.currentPeriodStart,
        end: snapshot.currentPeriodEnd,
        totalDays: snapshot.daysTotal,
        remainingDays: snapshot.daysRemaining,
      },
      creditAmount,
      targetCostForRemaining,
      amountDueNow,
      carryOverBalance,
    };
  }
}
