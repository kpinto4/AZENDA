"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAppointmentWhenLocal = parseAppointmentWhenLocal;
exports.appointmentStartMs = appointmentStartMs;
exports.isAppointmentFuture = isAppointmentFuture;
function parseAppointmentWhenLocal(when) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
    if (!m) {
        return null;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const dt = new Date(y, mo - 1, d, hh, mm, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
}
function appointmentStartMs(when) {
    const at = parseAppointmentWhenLocal(when);
    return at ? at.getTime() : null;
}
function isAppointmentFuture(when, nowMs = Date.now()) {
    const ms = appointmentStartMs(when);
    return ms != null && ms > nowMs;
}
//# sourceMappingURL=appointment-time.util.js.map