"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeColombiaMobileDigits = normalizeColombiaMobileDigits;
exports.isValidColombiaMobileInput = isValidColombiaMobileInput;
function normalizeColombiaMobileDigits(raw) {
    if (raw == null) {
        return null;
    }
    let d = raw.replace(/\D/g, '');
    if (!d) {
        return null;
    }
    if (d.startsWith('00')) {
        d = d.slice(2);
    }
    if (d.startsWith('57') && d.length === 12) {
        d = d.slice(2);
    }
    if (!/^3\d{9}$/.test(d)) {
        return null;
    }
    return `57${d}`;
}
function isValidColombiaMobileInput(raw) {
    return normalizeColombiaMobileDigits(raw) != null;
}
//# sourceMappingURL=phone-co.util.js.map