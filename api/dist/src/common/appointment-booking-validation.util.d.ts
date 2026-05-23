import type { AppointmentEntity, TenantServiceEntity, UserEntity } from '../infrastructure/sql-db/sql-db.types';
import { type ScheduledInterval } from './appointment-scheduling.util';
export declare function activeEmployeeIds(users: UserEntity[]): string[];
export declare function dayAppointmentIntervals(appointments: AppointmentEntity[], catalog: TenantServiceEntity[], dateYmd: string, excludeId?: string): ScheduledInterval[];
export declare function assertSlotWithinBusinessHours(dateYmd: string, timeHhmm: string, durationMinutes: number, publicBookingHoursJson: string | null, now?: Date): void;
export declare function pickEmployeeForBookingSlot(dateYmd: string, timeHhmm: string, durationMinutes: number, requestedEmployeeId: string, employeeIds: string[], intervals: ScheduledInterval[], latestClosingMinute: number | null): string | null;
export declare function appendEmployeeToServiceLabel(service: string, employeeId: string): string;
export declare function resolveBookingDurationMinutes(serviceLabel: string, catalog: TenantServiceEntity[]): number;
