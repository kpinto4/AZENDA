"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planCatalogPricePatch = planCatalogPricePatch;
exports.applyPlanCatalogPricesToSiteConfig = applyPlanCatalogPricesToSiteConfig;
const PLAN_KEY_TO_SITE_PRICE = {
    Básico: 'planPriceBasic',
    Pro: 'planPricePro',
    Negocio: 'planPriceBusiness',
};
function normalizePlanKey(key) {
    return key
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function sitePriceFieldForPlanKey(planKey) {
    const direct = PLAN_KEY_TO_SITE_PRICE[planKey];
    if (direct) {
        return direct;
    }
    const normalized = normalizePlanKey(planKey);
    for (const [key, field] of Object.entries(PLAN_KEY_TO_SITE_PRICE)) {
        if (normalizePlanKey(key) === normalized) {
            return field;
        }
    }
    return undefined;
}
function planCatalogPricePatch(entries) {
    const patch = {};
    for (const entry of entries) {
        const field = sitePriceFieldForPlanKey(entry.planKey);
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