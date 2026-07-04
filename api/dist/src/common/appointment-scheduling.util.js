"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MULTI_SERVICE_LABEL_SEPARATOR = exports.BOOKING_SLOT_STEP_MINUTES = void 0;
exports.stripPublicServiceName = stripPublicServiceName;
exports.readEmployeeIdFromServiceText = readEmployeeIdFromServiceText;
exports.appointmentStartMs = appointmentStartMs;
exports.resolveDurationForSingleServiceLabel = resolveDurationForSingleServiceLabel;
exports.resolveDurationForServiceLabel = resolveDurationForServiceLabel;
exports.resolveAppointmentDurationMinutes = resolveAppointmentDurationMinutes;
exports.appointmentInterval = appointmentInterval;
exports.applyUnknownOccupancy = applyUnknownOccupancy;
exports.employeesBlockedInRange = employeesBlockedInRange;
exports.isSlotAvailableForEmployee = isSlotAvailableForEmployee;
exports.parseSlotMinutes = parseSlotMinutes;
const service_duration_util_1 = require("./service-duration.util");
exports.BOOKING_SLOT_STEP_MINUTES = 30;
exports.MULTI_SERVICE_LABEL_SEPARATOR = ' || ';
function stripPublicServiceName(raw) {
    const withoutEmp = raw
        .replace(/\s*·\s*EmpleadoId:[A-Za-z0-9_-]+.*$/i, '')
        .trim();
    const first = withoutEmp.split(' · ')[0]?.trim();
    return first || withoutEmp;
}
function readEmployeeIdFromServiceText(value) {
    const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(value);
    const id = m?.[1] ?? null;
    return id && id !== 'any' ? id : null;
}
function appointmentStartMs(when) {
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
    if (!m) {
        return null;
    }
    const hh = m[2].padStart(2, '0');
    const d = new Date(`${m[1]}T${hh}:${m[3]}:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
}
function resolveDurationForSingleServiceLabel(serviceLabel, catalog) {
    const name = stripPublicServiceName(serviceLabel);
    const fromName = (0, service_duration_util_1.inferDurationMinutesFromServiceName)(name);
    if (fromName !== service_duration_util_1.DEFAULT_SERVICE_DURATION_MINUTES) {
        return fromName;
    }
    const exact = catalog.find((s) => s.name === name);
    if (exact) {
        return exact.durationMinutes;
    }
    const partial = catalog.find((s) => name.includes(s.name) || s.name.includes(name));
    if (partial) {
        return partial.durationMinutes;
    }
    return service_duration_util_1.DEFAULT_SERVICE_DURATION_MINUTES;
}
function resolveDurationForServiceLabel(serviceLabel, catalog) {
    if (serviceLabel.includes(exports.MULTI_SERVICE_LABEL_SEPARATOR)) {
        return serviceLabel
            .split(exports.MULTI_SERVICE_LABEL_SEPARATOR)
            .map((part) => part.trim())
            .filter(Boolean)
            .reduce((sum, part) => sum + resolveDurationForSingleServiceLabel(part, catalog), 0);
    }
    return resolveDurationForSingleServiceLabel(serviceLabel, catalog);
}
function resolveAppointmentDurationMinutes(appt, catalog) {
    if (appt.durationMinutes != null && appt.durationMinutes > 0) {
        return (0, service_duration_util_1.normalizeServiceDurationMinutes)(appt.durationMinutes);
    }
    return resolveDurationForServiceLabel(appt.service, catalog);
}
function appointmentInterval(appt, catalog) {
    const startMs = appointmentStartMs(appt.when);
    if (startMs == null) {
        return null;
    }
    const durationMinutes = resolveAppointmentDurationMinutes(appt, catalog);
    return {
        startMs,
        endMs: startMs + durationMinutes * 60_000,
        employeeId: readEmployeeIdFromServiceText(appt.service),
    };
}
function intervalsOverlap(a, b) {
    return a.startMs < b.endMs && b.startMs < a.endMs;
}
function applyUnknownOccupancy(employeeIds, knownTaken, unknownCount) {
    if (unknownCount <= 0 || employeeIds.length === 0) {
        return knownTaken;
    }
    const out = new Set(knownTaken);
    let pending = unknownCount;
    for (const id of employeeIds) {
        if (pending <= 0) {
            break;
        }
        if (out.has(id)) {
            continue;
        }
        out.add(id);
        pending -= 1;
    }
    return out;
}
function employeesBlockedInRange(startMs, endMs, employeeIds, intervals) {
    const probe = { startMs, endMs };
    const blocked = new Set();
    let unknownCount = 0;
    for (const iv of intervals) {
        if (!intervalsOverlap(probe, iv)) {
            continue;
        }
        if (iv.employeeId) {
            blocked.add(iv.employeeId);
        }
        else {
            unknownCount += 1;
        }
    }
    return applyUnknownOccupancy(employeeIds, blocked, unknownCount);
}
function isSlotAvailableForEmployee(dateYmd, slotHhmm, durationMinutes, employeeId, employeeIds, intervals, latestClosingMinute) {
    const startMin = parseSlotMinutes(slotHhmm);
    if (startMin == null) {
        return false;
    }
    if (latestClosingMinute != null &&
        startMin + durationMinutes > latestClosingMinute) {
        return false;
    }
    const startMs = appointmentStartMs(`${dateYmd} ${slotHhmm}`);
    if (startMs == null) {
        return false;
    }
    const endMs = startMs + durationMinutes * 60_000;
    const blocked = employeesBlockedInRange(startMs, endMs, employeeIds, intervals);
    return !blocked.has(employeeId);
}
function parseSlotMinutes(slotHhmm) {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(slotHhmm.trim());
    if (!m) {
        return null;
    }
    return Number(m[1]) * 60 + Number(m[2]);
}
//# sourceMappingURL=appointment-scheduling.util.js.map