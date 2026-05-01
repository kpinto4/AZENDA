import { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PatchAppointmentAttendanceDto } from './dto/patch-appointment-attendance.dto';
import { PatchAppointmentStatusDto } from './dto/patch-appointment-status.dto';
import { TenantAppointmentsService } from './tenant-appointments.service';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class TenantAppointmentsController {
    private readonly appointments;
    constructor(appointments: TenantAppointmentsService);
    list(req: AuthenticatedRequest): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity[]>;
    create(req: AuthenticatedRequest, dto: CreateAppointmentDto): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity>;
    patchStatus(req: AuthenticatedRequest, appointmentId: string, dto: PatchAppointmentStatusDto): import("../infrastructure/sql-db/sql-db.types").AppointmentEntity;
    patchAttendance(req: AuthenticatedRequest, appointmentId: string, dto: PatchAppointmentAttendanceDto): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity>;
}
export {};
