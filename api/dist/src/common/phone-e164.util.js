"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneToWaDigits = normalizePhoneToWaDigits;
function normalizePhoneToWaDigits(raw, defaultCountryCode) {
    if (raw == null) {
        return null;
    }
    let d = raw.replace(/\D/g, '');
    if (!d) {
        return null;
    }
    const cc = defaultCountryCode.replace(/\D/g, '');
    if (d.startsWith('00')) {
        d = d.slice(2);
    }
    if (d.startsWith('0') && cc && d.length >= 9) {
        d = `${cc}${d.replace(/^0+/, '')}`;
    }
    if (cc && d.length === 9 && /^\d{9}$/.test(d)) {
        d = `${cc}${d}`;
    }
    if (d.length < 10 || d.length > 15) {
        return null;
    }
    return d;
}
//# sourceMappingURL=phone-e164.util.js.map