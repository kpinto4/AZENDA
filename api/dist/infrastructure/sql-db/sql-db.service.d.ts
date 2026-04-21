import { AppointmentAttendance, AppointmentEntity, AppointmentStatus, StoreVisitLogEntity, TenantEntity, UserEntity } from './sql-db.types';
export declare class SqlDbService {
    private readonly db;
    constructor();
    findUserByCredentials(email: string, password: string): UserEntity | undefined;
    findUserById(userId: string): UserEntity | undefined;
    listUsers(): UserEntity[];
    createUser(data: UserEntity): UserEntity;
    updateUser(userId: string, patch: Partial<Omit<UserEntity, 'id'>>): UserEntity | undefined;
    deleteUser(userId: string): boolean;
    listTenants(): TenantEntity[];
    findTenantBySlug(slug: string): TenantEntity | undefined;
    findTenantById(tenantId: string): TenantEntity | undefined;
    createTenant(data: TenantEntity): TenantEntity;
    updateTenant(tenantId: string, patch: Omit<Partial<TenantEntity>, 'modules'> & {
        modules?: Partial<TenantEntity['modules']>;
    }): TenantEntity | undefined;
    deleteTenant(tenantId: string): boolean;
    listAppointmentsByTenantId(tenantId: string): AppointmentEntity[];
    createAppointment(data: {
        tenantId: string;
        customer: string;
        service: string;
        when: string;
        status?: AppointmentStatus;
        attendance?: AppointmentAttendance;
    }): AppointmentEntity;
    findAppointmentById(appointmentId: string): AppointmentEntity | undefined;
    updateAppointmentStatus(appointmentId: string, tenantId: string, status: AppointmentStatus): AppointmentEntity | undefined;
    updateAppointmentAttendance(appointmentId: string, tenantId: string, attendance: AppointmentAttendance): AppointmentEntity | undefined;
    confirmPublicAppointmentAttendance(slug: string, appointmentId: string, customerName: string): AppointmentEntity | undefined;
    listStoreVisitsByTenantId(tenantId: string): StoreVisitLogEntity[];
    createStoreVisitLog(data: {
        tenantId: string;
        customer: string;
        detail: string;
    }): StoreVisitLogEntity;
    private ensureSchemaMigrations;
    private createSchema;
    private seedIfEmpty;
    private mapUserRow;
    private mapTenantRow;
    private mapAppointmentRow;
    private mapStoreVisitRow;
}
