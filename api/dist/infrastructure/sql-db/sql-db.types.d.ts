import { AppSystem, UserRole, UserStatus } from '../../auth/auth.types';
export interface TenantEntity {
    id: string;
    name: string;
    slug: string;
    status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
    plan: string;
    storefrontEnabled: boolean;
    manualBookingEnabled: boolean;
    modules: {
        citas: boolean;
        ventas: boolean;
        inventario: boolean;
    };
}
export interface UserEntity {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    tenantId: string | null;
    systems: AppSystem[];
    status: UserStatus;
}
export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada';
export type AppointmentAttendance = 'PENDIENTE' | 'ASISTIO' | 'NO_ASISTIO';
export interface AppointmentEntity {
    id: string;
    tenantId: string;
    customer: string;
    service: string;
    when: string;
    status: AppointmentStatus;
    attendance: AppointmentAttendance;
}
export interface StoreVisitLogEntity {
    id: string;
    tenantId: string;
    customer: string;
    detail: string;
    createdAt: string;
}
