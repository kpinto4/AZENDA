import type { AppointmentEntity, TenantServiceEntity, UserEntity } from '../infrastructure/sql-db/sql-db.types';
import {
  appointmentInterval,
  isSlotAvailableForEmployee,
  parseSlotMinutes,
  readEmployeeIdFromServiceText,
  resolveDurationForServiceLabel,
  type ScheduledInterval,
} from './appointment-scheduling.util';
import {
  latestClosingMinuteForDate,
  parseWeeklyHoursJson,
  slotsForPublicBookingDate,
} from './public-booking-hours.util';

export function activeEmployeeIds(users: UserEntity[]): string[] {
  return users
    .filter((u) => u.status === 'ACTIVE' && (u.role === 'ADMIN' || u.role === 'EMPLEADO'))
    .map((u) => u.id);
}

export function dayAppointmentIntervals(
  appointments: AppointmentEntity[],
  catalog: TenantServiceEntity[],
  dateYmd: string,
  excludeId?: string,
): ScheduledInterval[] {
  return appointments
    .filter(
      (a) =>
        a.status !== 'cancelada' &&
        a.when.startsWith(`${dateYmd} `) &&
        (excludeId == null || a.id !== excludeId),
    )
    .map((a) => appointmentInterval(a, catalog))
    .filter((x): x is ScheduledInterval => x != null);
}

export function assertSlotWithinBusinessHours(
  dateYmd: string,
  timeHhmm: string,
  durationMinutes: number,
  publicBookingHoursJson: string | null,
  now = new Date(),
): void {
  const weekly = parseWeeklyHoursJson(publicBookingHoursJson);
  const openSlots = slotsForPublicBookingDate(weekly, dateYmd, now);
  if (!openSlots.includes(timeHhmm)) {
    throw new Error('SLOT_CLOSED');
  }
  const latestClose = latestClosingMinuteForDate(weekly, dateYmd);
  const startMin = parseSlotMinutes(timeHhmm);
  if (startMin == null) {
    throw new Error('SLOT_INVALID');
  }
  if (latestClose != null && startMin + durationMinutes > latestClose) {
    throw new Error('SLOT_PAST_CLOSING');
  }
}

export function pickEmployeeForBookingSlot(
  dateYmd: string,
  timeHhmm: string,
  durationMinutes: number,
  requestedEmployeeId: string,
  employeeIds: string[],
  intervals: ScheduledInterval[],
  latestClosingMinute: number | null,
): string | null {
  if (requestedEmployeeId) {
    const ok = isSlotAvailableForEmployee(
      dateYmd,
      timeHhmm,
      durationMinutes,
      requestedEmployeeId,
      employeeIds,
      intervals,
      latestClosingMinute,
    );
    return ok ? requestedEmployeeId : null;
  }
  const free = employeeIds.find((id) =>
    isSlotAvailableForEmployee(
      dateYmd,
      timeHhmm,
      durationMinutes,
      id,
      employeeIds,
      intervals,
      latestClosingMinute,
    ),
  );
  return free ?? null;
}

export function appendEmployeeToServiceLabel(
  service: string,
  employeeId: string,
): string {
  const trimmed = service.trim();
  if (readEmployeeIdFromServiceText(trimmed)) {
    return trimmed;
  }
  return `${trimmed} · EmpleadoId:${employeeId}`;
}

export function resolveBookingDurationMinutes(
  serviceLabel: string,
  catalog: TenantServiceEntity[],
): number {
  return resolveDurationForServiceLabel(serviceLabel, catalog);
}
