"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProductionEnv = isProductionEnv;
exports.isDemoFeaturesEnabled = isDemoFeaturesEnabled;
function isProductionEnv() {
    return (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
}
function isDemoFeaturesEnabled() {
    if (isProductionEnv()) {
        return ((process.env.AZENDA_DEMO_ENABLED ?? '').trim().toLowerCase() === 'true');
    }
    return true;
}
//# sourceMappingURL=env.util.js.map