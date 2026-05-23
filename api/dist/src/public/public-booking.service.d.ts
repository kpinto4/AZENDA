import { UserRole } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { AppointmentEntity, TenantServiceEntity } from '../infrastructure/sql-db/sql-db.types';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
import { LookupPublicAppointmentsDto } from './dto/lookup-public-appointments.dto';
import { ReschedulePublicAppointmentDto } from './dto/reschedule-public-appointment.dto';
import { BookingNotificationService } from './booking-notification.service';
export declare class PublicBookingService {
    private readonly sqlDb;
    private readonly bookingNotifications;
    constructor(sqlDb: SqlDbService, bookingNotifications: BookingNotificationService);
    private listActivePublicEmployees;
    private computeOpenSlotsForDate;
    private dayIntervals;
    private assertSlotFitsBusinessHours;
    private pickEmployeeForSlot;
    getSiteConfig(): Promise<import("../infrastructure/sql-db/sql-db.types").PlatformSiteConfig>;
    getPublicMeta(slug: string): Promise<{
        slug: string;
        name: string;
        active: boolean;
        plan: string;
        modules: {
            citas: boolean;
            ventas: boolean;
            inventario: boolean;
        };
        storefrontEnabled: boolean;
        catalogoActivo: boolean;
        branding: import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
    }>;
    getPublicCatalog(slug: string): Promise<{
        products: import("../infrastructure/sql-db/sql-db.types").TenantProductEntity[];
        services: TenantServiceEntity[];
        branding: import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
        employees: {
            id: string;
            name: string;
            role: UserRole;
        }[];
    }>;
    getPublicAvailability(slug: string, date: string, durationMinutesRaw?: number): Promise<{
        date: string;
        durationMinutes: number;
        slotsByEmployee: Record<string, string[]>;
        allSlots: string[];
        employees: {
            id: string;
            name: string;
            role: UserRole;
        }[];
    }>;
    createBooking(slug: string, dto: CreatePublicAppointmentDto): Promise<AppointmentEntity>;
    reprogramarCita(slug: string, dto: ReschedulePublicAppointmentDto): Promise<AppointmentEntity>;
    confirmAttendance(slug: string, dto: ConfirmPublicAttendanceDto): Promise<AppointmentEntity>;
    buscarCitasActivas(slug: string, dto: LookupPublicAppointmentsDto): Promise<{
        appointments: {
            id: string;
            when: string;
            serviceLabel: string;
            customer: string;
            employeeId: string | null;
            status: import("../infrastructure/sql-db/sql-db.types").AppointmentStatus;
            attendance: import("../infrastructure/sql-db/sql-db.types").AppointmentAttendance;
        }[];
    }>;
    createStoreVisit(slug: string, dto: CreatePublicStoreVisitDto): Promise<import("../infrastructure/sql-db/sql-db.types").StoreVisitLogEntity>;
}
