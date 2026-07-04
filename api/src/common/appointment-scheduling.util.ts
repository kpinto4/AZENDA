import type {
  AppointmentEntity,
  TenantServiceEntity,
} from '../infrastructure/sql-db/sql-db.types';
import {
  DEFAULT_SERVICE_DURATION_MINUTES,
  inferDurationMinutesFromServiceName,
  normalizeServiceDurationMinutes,
} from './service-duration.util';

export const BOOKING_SLOT_STEP_MINUTES = 30;

export interface ScheduledInterval {
  startMs: number;
  endMs: number;
  employeeId: string | null;
}

export const MULTI_SERVICE_LABEL_SEPARATOR = ' || ';

export function stripPublicServiceName(raw: string): string {
  const withoutEmp = raw
    .replace(/\s*·\s*EmpleadoId:[A-Za-z0-9_-]+.*$/i, '')
    .trim();
  const first = withoutEmp.split(' · ')[0]?.trim();
  return first || withoutEmp;
}

export function readEmployeeIdFromServiceText(value: string): string | null {
  const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(value);
  const id = m?.[1] ?? null;
  return id && id !== 'any' ? id : null;
}

export function appointmentStartMs(when: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
  if (!m) {
    return null;
  }
  const hh = m[2].padStart(2, '0');
  const d = new Date(`${m[1]}T${hh}:${m[3]}:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function resolveDurationForSingleServiceLabel(
  serviceLabel: string,
  catalog: TenantServiceEntity[],
): number {
  const name = stripPublicServiceName(serviceLabel);
  const fromName = inferDurationMinutesFromServiceName(name);
  if (fromName !== DEFAULT_SERVICE_DURATION_MINUTES) {
    return fromName;
  }
  const exact = catalog.find((s) => s.name === name);
  if (exact) {
    return exact.durationMinutes;
  }
  const partial = catalog.find(
    (s) => name.includes(s.name) || s.name.includes(name),
  );
  if (partial) {
    return partial.durationMinutes;
  }
  return DEFAULT_SERVICE_DURATION_MINUTES;
}

export function resolveDurationForServiceLabel(
  serviceLabel: string,
  catalog: TenantServiceEntity[],
): number {
  if (serviceLabel.includes(MULTI_SERVICE_LABEL_SEPARATOR)) {
    return serviceLabel
      .split(MULTI_SERVICE_LABEL_SEPARATOR)
      .map((part) => part.trim())
      .filter(Boolean)
      .reduce(
        (sum, part) =>
          sum + resolveDurationForSingleServiceLabel(part, catalog),
        0,
      );
  }
  return resolveDurationForSingleServiceLabel(serviceLabel, catalog);
}

export function resolveAppointmentDurationMinutes(
  appt: Pick<AppointmentEntity, 'service' | 'durationMinutes'>,
  catalog: TenantServiceEntity[],
): number {
  if (appt.durationMinutes != null && appt.durationMinutes > 0) {
    return normalizeServiceDurationMinutes(appt.durationMinutes);
  }
  return resolveDurationForServiceLabel(appt.service, catalog);
}

export function appointmentInterval(
  appt: Pick<AppointmentEntity, 'when' | 'service' | 'durationMinutes'>,
  catalog: TenantServiceEntity[],
): ScheduledInterval | null {
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

function intervalsOverlap(
  a: ScheduledInterval | { startMs: number; endMs: number },
  b: ScheduledInterval,
): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** Reparte citas sin empleado fijo entre profesionales libres (misma regla que antes). */
export function applyUnknownOccupancy(
  employeeIds: string[],
  knownTaken: Set<string>,
  unknownCount: number,
): Set<string> {
  if (unknownCount <= 0 || employeeIds.length === 0) {
    return knownTaken;
  }
  const out = new Set<string>(knownTaken);
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

export function employeesBlockedInRange(
  startMs: number,
  endMs: number,
  employeeIds: string[],
  intervals: ScheduledInterval[],
): Set<string> {
  const probe = { startMs, endMs };
  const blocked = new Set<string>();
  let unknownCount = 0;
  for (const iv of intervals) {
    if (!intervalsOverlap(probe, iv)) {
      continue;
    }
    if (iv.employeeId) {
      blocked.add(iv.employeeId);
    } else {
      unknownCount += 1;
    }
  }
  return applyUnknownOccupancy(employeeIds, blocked, unknownCount);
}

export function isSlotAvailableForEmployee(
  dateYmd: string,
  slotHhmm: string,
  durationMinutes: number,
  employeeId: string,
  employeeIds: string[],
  intervals: ScheduledInterval[],
  latestClosingMinute: number | null,
): boolean {
  const startMin = parseSlotMinutes(slotHhmm);
  if (startMin == null) {
    return false;
  }
  if (
    latestClosingMinute != null &&
    startMin + durationMinutes > latestClosingMinute
  ) {
    return false;
  }
  const startMs = appointmentStartMs(`${dateYmd} ${slotHhmm}`);
  if (startMs == null) {
    return false;
  }
  const endMs = startMs + durationMinutes * 60_000;
  const blocked = employeesBlockedInRange(
    startMs,
    endMs,
    employeeIds,
    intervals,
  );
  return !blocked.has(employeeId);
}

export function parseSlotMinutes(slotHhmm: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(slotHhmm.trim());
  if (!m) {
    return null;
  }
  return Number(m[1]) * 60 + Number(m[2]);
}
