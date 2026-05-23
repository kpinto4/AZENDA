"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeEmployeeIds = activeEmployeeIds;
exports.dayAppointmentIntervals = dayAppointmentIntervals;
exports.assertSlotWithinBusinessHours = assertSlotWithinBusinessHours;
exports.pickEmployeeForBookingSlot = pickEmployeeForBookingSlot;
exports.appendEmployeeToServiceLabel = appendEmployeeToServiceLabel;
exports.resolveBookingDurationMinutes = resolveBookingDurationMinutes;
const appointment_scheduling_util_1 = require("./appointment-scheduling.util");
const public_booking_hours_util_1 = require("./public-booking-hours.util");
function activeEmployeeIds(users) {
    return users
        .filter((u) => u.status === 'ACTIVE' && (u.role === 'ADMIN' || u.role === 'EMPLEADO'))
        .map((u) => u.id);
}
function dayAppointmentIntervals(appointments, catalog, dateYmd, excludeId) {
    return appointments
        .filter((a) => a.status !== 'cancelada' &&
        a.when.startsWith(`${dateYmd} `) &&
        (excludeId == null || a.id !== excludeId))
        .map((a) => (0, appointment_scheduling_util_1.appointmentInterval)(a, catalog))
        .filter((x) => x != null);
}
function assertSlotWithinBusinessHours(dateYmd, timeHhmm, durationMinutes, publicBookingHoursJson, now = new Date()) {
    const weekly = (0, public_booking_hours_util_1.parseWeeklyHoursJson)(publicBookingHoursJson);
    const openSlots = (0, public_booking_hours_util_1.slotsForPublicBookingDate)(weekly, dateYmd, now);
    if (!openSlots.includes(timeHhmm)) {
        throw new Error('SLOT_CLOSED');
    }
    const latestClose = (0, public_booking_hours_util_1.latestClosingMinuteForDate)(weekly, dateYmd);
    const startMin = (0, appointment_scheduling_util_1.parseSlotMinutes)(timeHhmm);
    if (startMin == null) {
        throw new Error('SLOT_INVALID');
    }
    if (latestClose != null && startMin + durationMinutes > latestClose) {
        throw new Error('SLOT_PAST_CLOSING');
    }
}
function pickEmployeeForBookingSlot(dateYmd, timeHhmm, durationMinutes, requestedEmployeeId, employeeIds, intervals, latestClosingMinute) {
    if (requestedEmployeeId) {
        const ok = (0, appointment_scheduling_util_1.isSlotAvailableForEmployee)(dateYmd, timeHhmm, durationMinutes, requestedEmployeeId, employeeIds, intervals, latestClosingMinute);
        return ok ? requestedEmployeeId : null;
    }
    const free = employeeIds.find((id) => (0, appointment_scheduling_util_1.isSlotAvailableForEmployee)(dateYmd, timeHhmm, durationMinutes, id, employeeIds, intervals, latestClosingMinute));
    return free ?? null;
}
function appendEmployeeToServiceLabel(service, employeeId) {
    const trimmed = service.trim();
    if ((0, appointment_scheduling_util_1.readEmployeeIdFromServiceText)(trimmed)) {
        return trimmed;
    }
    return `${trimmed} · EmpleadoId:${employeeId}`;
}
function resolveBookingDurationMinutes(serviceLabel, catalog) {
    return (0, appointment_scheduling_util_1.resolveDurationForServiceLabel)(serviceLabel, catalog);
}
//# sourceMappingURL=appointment-booking-validation.util.js.map