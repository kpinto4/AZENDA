"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planCatalogPricePatch = planCatalogPricePatch;
exports.applyPlanCatalogPricesToSiteConfig = applyPlanCatalogPricesToSiteConfig;
const PLAN_KEY_TO_SITE_PRICE = {
    Básico: 'planPriceBasic',
    Pro: 'planPricePro',
    Negocio: 'planPriceBusiness',
};
function planCatalogPricePatch(entries) {
    const patch = {};
    for (const entry of entries) {
        const field = PLAN_KEY_TO_SITE_PRICE[entry.planKey];
        if (field && entry.priceMonthly != null) {
            patch[field] = entry.priceMonthly;
        }
    }
    return patch;
}
function applyPlanCatalogPricesToSiteConfig(config, entries) {
    const patch = planCatalogPricePatch(entries);
    if (Object.keys(patch).length === 0) {
        return config;
    }
    return { ...config, ...patch };
}
//# sourceMappingURL=plan-catalog-site-config.js.map