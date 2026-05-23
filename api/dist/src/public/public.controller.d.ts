import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
import { LookupPublicAppointmentsDto } from './dto/lookup-public-appointments.dto';
import { ReschedulePublicAppointmentDto } from './dto/reschedule-public-appointment.dto';
import { PublicBookingService } from './public-booking.service';
export declare class PublicController {
    private readonly booking;
    constructor(booking: PublicBookingService);
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
        services: import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity[];
        branding: import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
        employees: {
            id: string;
            name: string;
            role: import("../auth/auth.types").UserRole;
        }[];
    }>;
    getPublicAvailability(slug: string, date: string, durationMinutes?: string): Promise<{
        date: string;
        durationMinutes: number;
        slotsByEmployee: Record<string, string[]>;
        allSlots: string[];
        employees: {
            id: string;
            name: string;
            role: import("../auth/auth.types").UserRole;
        }[];
    }>;
    createBooking(slug: string, dto: CreatePublicAppointmentDto): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity>;
    reprogramarCita(slug: string, dto: ReschedulePublicAppointmentDto): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity>;
    confirmAttendance(slug: string, dto: ConfirmPublicAttendanceDto): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity>;
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
