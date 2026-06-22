"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultModulesForPlan = defaultModulesForPlan;
function defaultModulesForPlan(plan) {
    switch (plan) {
        case 'Trial':
            return { citas: true, ventas: false, inventario: false };
        case 'Básico':
            return { citas: true, ventas: true, inventario: false };
        case 'Pro':
        case 'Negocio':
            return { citas: true, ventas: true, inventario: true };
        default:
            return { citas: true, ventas: false, inventario: false };
    }
}
//# sourceMappingURL=plan-modules.js.map