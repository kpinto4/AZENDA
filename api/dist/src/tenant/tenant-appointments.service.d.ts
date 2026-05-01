import { AuthUser } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { AppointmentEntity } from '../infrastructure/sql-db/sql-db.types';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PatchAppointmentAttendanceDto } from './dto/patch-appointment-attendance.dto';
import { PatchAppointmentStatusDto } from './dto/patch-appointment-status.dto';
export declare class TenantAppointmentsService {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
    listForUser(user: AuthUser): Promise<AppointmentEntity[]>;
    createForUser(user: AuthUser, dto: CreateAppointmentDto): Promise<AppointmentEntity>;
    patchStatus(user: AuthUser, appointmentId: string, dto: PatchAppointmentStatusDto): AppointmentEntity;
    patchAttendance(user: AuthUser, appointmentId: string, dto: PatchAppointmentAttendanceDto): Promise<AppointmentEntity>;
    private requireTenantUser;
}
