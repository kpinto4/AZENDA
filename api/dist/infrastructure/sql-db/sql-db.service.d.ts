import { AppointmentAttendance, AppointmentEntity, AppointmentStatus, StoreVisitLogEntity, TenantBrandingEntity, TenantEntity, TenantProductEntity, TenantServiceEntity, UserEntity } from './sql-db.types';
export declare class SqlDbService {
    private readonly db;
    constructor();
    findUserByCredentials(email: string, password: string): UserEntity | undefined;
    findUserById(userId: string): UserEntity | undefined;
    listUsers(): UserEntity[];
    listUsersByTenantId(tenantId: string): UserEntity[];
    createUser(data: UserEntity): UserEntity;
    updateUser(userId: string, patch: Partial<Omit<UserEntity, 'id'>>): UserEntity | undefined;
    deleteUser(userId: string): boolean;
    deleteUserByTenant(userId: string, tenantId: string): boolean;
    listTenants(): TenantEntity[];
    findTenantBySlug(slug: string): TenantEntity | undefined;
    findTenantById(tenantId: string): TenantEntity | undefined;
    createTenant(data: Omit<TenantEntity, 'manualBookingEnabled'> & {
        manualBookingEnabled?: boolean;
    }): TenantEntity;
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
    getTenantBranding(tenantId: string): TenantBrandingEntity;
    updateTenantBranding(tenantId: string, patch: Partial<Omit<TenantBrandingEntity, 'tenantId'>>): TenantBrandingEntity;
    listProductsByTenantId(tenantId: string): TenantProductEntity[];
    createTenantProduct(tenantId: string, data: Omit<TenantProductEntity, 'id' | 'tenantId' | 'catalogOrder'>): TenantProductEntity;
    updateTenantProduct(tenantId: string, productId: string, patch: Omit<Partial<TenantProductEntity>, 'id' | 'tenantId' | 'catalogOrder'>): TenantProductEntity | undefined;
    deleteTenantProduct(tenantId: string, productId: string): boolean;
    moveTenantProduct(tenantId: string, productId: string, direction: -1 | 1): void;
    listServicesByTenantId(tenantId: string): TenantServiceEntity[];
    createTenantService(tenantId: string, data: Omit<TenantServiceEntity, 'id' | 'tenantId' | 'catalogOrder'>): TenantServiceEntity;
    updateTenantService(tenantId: string, serviceId: string, patch: Omit<Partial<TenantServiceEntity>, 'id' | 'tenantId' | 'catalogOrder'>): TenantServiceEntity | undefined;
    deleteTenantService(tenantId: string, serviceId: string): boolean;
    moveTenantService(tenantId: string, serviceId: string, direction: -1 | 1): void;
    private ensureSchemaMigrations;
    private createSchema;
    private seedIfEmpty;
    private ensureTenantBranding;
    private mapUserRow;
    private mapTenantRow;
    private mapAppointmentRow;
    private mapStoreVisitRow;
    private mapTenantBrandingRow;
    private mapTenantProductRow;
    private mapTenantServiceRow;
}
