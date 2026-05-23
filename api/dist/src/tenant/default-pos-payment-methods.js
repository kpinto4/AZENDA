"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POS_PAYMENT_METHODS = void 0;
exports.defaultPosPaymentMethodsJson = defaultPosPaymentMethodsJson;
exports.parsePosPaymentMethodsJson = parsePosPaymentMethodsJson;
exports.DEFAULT_POS_PAYMENT_METHODS = [
    { id: 'efectivo', label: 'Efectivo', enabled: true, detail: '' },
    { id: 'tarjeta', label: 'Tarjeta / datáfono', enabled: true, detail: '' },
    { id: 'transferencia', label: 'Transferencia', enabled: false, detail: '' },
    { id: 'nequi', label: 'Nequi', enabled: false, detail: '' },
    { id: 'daviplata', label: 'Daviplata', enabled: false, detail: '' },
];
function defaultPosPaymentMethodsJson() {
    return JSON.stringify(exports.DEFAULT_POS_PAYMENT_METHODS);
}
function parsePosPaymentMethodsJson(raw) {
    if (!raw?.trim()) {
        return [...exports.DEFAULT_POS_PAYMENT_METHODS];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [...exports.DEFAULT_POS_PAYMENT_METHODS];
        }
        const out = [];
        for (const item of parsed) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const o = item;
            const id = String(o['id'] ?? '').trim();
            const label = String(o['label'] ?? '').trim();
            if (!id || !label) {
                continue;
            }
            out.push({
                id,
                label,
                enabled: o['enabled'] !== false,
                detail: String(o['detail'] ?? '').trim(),
            });
        }
        return out.length ? out : [...exports.DEFAULT_POS_PAYMENT_METHODS];
    }
    catch {
        return [...exports.DEFAULT_POS_PAYMENT_METHODS];
    }
}
//# sourceMappingURL=default-pos-payment-methods.js.map