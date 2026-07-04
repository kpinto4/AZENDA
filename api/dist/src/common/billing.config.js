"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAnnualBillingEnabled = isAnnualBillingEnabled;
exports.normalizeBillingCycle = normalizeBillingCycle;
function isAnnualBillingEnabled() {
    return ((process.env.AZENDA_ANNUAL_BILLING ?? '').trim().toLowerCase() === 'true');
}
function normalizeBillingCycle(cycle) {
    if (isAnnualBillingEnabled() && cycle === 'YEARLY') {
        return 'YEARLY';
    }
    return 'MONTHLY';
}
//# sourceMappingURL=billing.config.js.map