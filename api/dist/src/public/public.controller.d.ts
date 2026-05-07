import { UserRole } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { AppointmentEntity } from '../infrastructure/sql-db/sql-db.types';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
export declare class PublicController {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
    private listActivePublicEmployees;
    private computeOpenSlotsForDate;
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
            role: UserRole;
        }[];
    }>;
    getPublicAvailability(slug: string, date: string): Promise<{
        date: string;
        slotsByEmployee: Record<string, string[]>;
        allSlots: string[];
        employees: {
            id: string;
            name: string;
            role: UserRole;
        }[];
    }>;
    createBooking(slug: string, dto: CreatePublicAppointmentDto): Promise<AppointmentEntity>;
    confirmAttendance(slug: string, dto: ConfirmPublicAttendanceDto): Promise<AppointmentEntity>;
    createStoreVisit(slug: string, dto: CreatePublicStoreVisitDto): Promise<import("../infrastructure/sql-db/sql-db.types").StoreVisitLogEntity>;
}
