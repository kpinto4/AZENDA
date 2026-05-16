"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantBillingService = void 0;
const common_1 = require("@nestjs/common");
const tenant_repository_1 = require("./repositories/tenant.repository");
let TenantBillingService = class TenantBillingService {
    constructor(tenants) {
        this.tenants = tenants;
    }
    round2(value) {
        return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    }
    async getTenantBillingSnapshot(tenantId) {
        const tenant = await this.tenants.findById(tenantId);
        if (!tenant) {
            return undefined;
        }
        const currentPeriodStart = tenant.currentPeriodStart;
        const currentPeriodEnd = tenant.currentPeriodEnd;
        const msTotal = Math.max(0, new Date(currentPeriodEnd).getTime() - new Date(currentPeriodStart).getTime());
        const nowMs = Date.now();
        const elapsedMs = Math.max(0, Math.min(msTotal, nowMs - new Date(currentPeriodStart).getTime()));
        const daysTotal = Math.max(1, Math.ceil(msTotal / (1000 * 60 * 60 * 24)));
        const daysElapsed = Math.min(daysTotal, Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24))));
        const daysRemaining = Math.max(0, daysTotal - daysElapsed);
        const progressPct = Math.max(0, Math.min(100, Number(((daysElapsed / daysTotal) * 100).toFixed(2))));
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
    async getUpgradeQuote(params) {
        const tenant = await this.tenants.findById(params.tenantId);
        if (!tenant) {
            return undefined;
        }
        const snapshot = await this.getTenantBillingSnapshot(params.tenantId);
        if (!snapshot) {
            return undefined;
        }
        const currentPrices = await this.tenants.getPlanCatalogPrices(tenant.plan);
        const targetPrices = await this.tenants.getPlanCatalogPrices(params.targetPlan);
        const currentCyclePrice = tenant.billingCycle === 'YEARLY' ? currentPrices.yearly : currentPrices.monthly;
        const targetCyclePrice = params.targetCycle === 'YEARLY' ? targetPrices.yearly : targetPrices.monthly;
        const ratioRemaining = snapshot.daysTotal > 0 ? snapshot.daysRemaining / snapshot.daysTotal : 0;
        const creditAmount = this.round2(currentCyclePrice * ratioRemaining);
        const targetCostForRemaining = this.round2(targetCyclePrice * ratioRemaining);
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
};
exports.TenantBillingService = TenantBillingService;
exports.TenantBillingService = TenantBillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_repository_1.TenantRepository])
], TenantBillingService);
//# sourceMappingURL=tenant-billing.service.js.map