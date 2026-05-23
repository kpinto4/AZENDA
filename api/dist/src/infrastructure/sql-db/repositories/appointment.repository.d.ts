import { PgClientService } from '../pg-client.service';
import { AppointmentAttendance, AppointmentEntity, AppointmentStatus } from '../sql-db.types';
import { TenantRepository } from './tenant.repository';
export declare class AppointmentRepository {
    private readonly pg;
    private readonly tenants;
    constructor(pg: PgClientService, tenants: TenantRepository);
    private mapAppointmentRow;
    listByTenantId(tenantId: string): Promise<AppointmentEntity[]>;
    create(data: {
        tenantId: string;
        customer: string;
        service: string;
        when: string;
        status?: AppointmentStatus;
        attendance?: AppointmentAttendance;
        customerPhoneE164?: string | null;
        waReminderConsent?: boolean;
        durationMinutes?: number | null;
    }): Promise<AppointmentEntity>;
    markReminderSentForTenant(appointmentId: string, tenantId: string): Promise<AppointmentEntity | undefined>;
    findByTenantAndWhen(tenantId: string, when: string): Promise<AppointmentEntity | undefined>;
    findById(appointmentId: string): Promise<AppointmentEntity | undefined>;
    updateWhenAndService(tenantId: string, appointmentId: string, when: string, service: string): Promise<AppointmentEntity | undefined>;
    updateStatus(appointmentId: string, tenantId: string, status: AppointmentStatus): Promise<AppointmentEntity | undefined>;
    updateAttendance(appointmentId: string, tenantId: string, attendance: AppointmentAttendance): Promise<AppointmentEntity | undefined>;
    confirmPublicAttendance(slug: string, appointmentId: string, customerName: string): Promise<AppointmentEntity | undefined>;
    lookupPublicForClient(slug: string, customerNameRaw: string | undefined | null, appointmentIdRaw?: string | null, customerPhoneRaw?: string | null): Promise<AppointmentEntity[]>;
}
