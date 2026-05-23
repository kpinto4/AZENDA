"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_SERVICE_DURATION_MINUTES = exports.MIN_SERVICE_DURATION_MINUTES = exports.DEFAULT_SERVICE_DURATION_MINUTES = void 0;
exports.inferDurationMinutesFromServiceName = inferDurationMinutesFromServiceName;
exports.normalizeServiceDurationMinutes = normalizeServiceDurationMinutes;
exports.normalizeTotalBookingDurationMinutes = normalizeTotalBookingDurationMinutes;
const DEFAULT_SERVICE_DURATION_MINUTES = 30;
exports.DEFAULT_SERVICE_DURATION_MINUTES = DEFAULT_SERVICE_DURATION_MINUTES;
const MIN_SERVICE_DURATION_MINUTES = 5;
exports.MIN_SERVICE_DURATION_MINUTES = MIN_SERVICE_DURATION_MINUTES;
const MAX_SERVICE_DURATION_MINUTES = 480;
exports.MAX_SERVICE_DURATION_MINUTES = MAX_SERVICE_DURATION_MINUTES;
function inferDurationMinutesFromServiceName(name) {
    const m = /(\d{2,3})\s*min/i.exec(name.trim());
    if (m) {
        const n = Number(m[1]);
        if (n >= MIN_SERVICE_DURATION_MINUTES && n <= MAX_SERVICE_DURATION_MINUTES) {
            return n;
        }
    }
    return DEFAULT_SERVICE_DURATION_MINUTES;
}
function normalizeServiceDurationMinutes(raw, nameFallback) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= MIN_SERVICE_DURATION_MINUTES && n <= MAX_SERVICE_DURATION_MINUTES) {
        return Math.round(n);
    }
    if (nameFallback?.trim()) {
        return inferDurationMinutesFromServiceName(nameFallback);
    }
    return DEFAULT_SERVICE_DURATION_MINUTES;
}
function normalizeTotalBookingDurationMinutes(raw) {
    const n = Number(raw);
    const maxTotal = MAX_SERVICE_DURATION_MINUTES * 4;
    if (Number.isFinite(n) && n >= MIN_SERVICE_DURATION_MINUTES && n <= maxTotal) {
        return Math.round(n);
    }
    return DEFAULT_SERVICE_DURATION_MINUTES;
}
//# sourceMappingURL=service-duration.util.js.map