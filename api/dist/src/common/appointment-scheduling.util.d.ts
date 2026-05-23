import type { AppointmentEntity, TenantServiceEntity } from '../infrastructure/sql-db/sql-db.types';
export declare const BOOKING_SLOT_STEP_MINUTES = 30;
export interface ScheduledInterval {
    startMs: number;
    endMs: number;
    employeeId: string | null;
}
export declare const MULTI_SERVICE_LABEL_SEPARATOR = " || ";
export declare function stripPublicServiceName(raw: string): string;
export declare function readEmployeeIdFromServiceText(value: string): string | null;
export declare function appointmentStartMs(when: string): number | null;
export declare function resolveDurationForSingleServiceLabel(serviceLabel: string, catalog: TenantServiceEntity[]): number;
export declare function resolveDurationForServiceLabel(serviceLabel: string, catalog: TenantServiceEntity[]): number;
export declare function resolveAppointmentDurationMinutes(appt: Pick<AppointmentEntity, 'service' | 'durationMinutes'>, catalog: TenantServiceEntity[]): number;
export declare function appointmentInterval(appt: Pick<AppointmentEntity, 'when' | 'service' | 'durationMinutes'>, catalog: TenantServiceEntity[]): ScheduledInterval | null;
export declare function applyUnknownOccupancy(employeeIds: string[], knownTaken: Set<string>, unknownCount: number): Set<string>;
export declare function employeesBlockedInRange(startMs: number, endMs: number, employeeIds: string[], intervals: ScheduledInterval[]): Set<string>;
export declare function isSlotAvailableForEmployee(dateYmd: string, slotHhmm: string, durationMinutes: number, employeeId: string, employeeIds: string[], intervals: ScheduledInterval[], latestClosingMinute: number | null): boolean;
export declare function parseSlotMinutes(slotHhmm: string): number | null;
