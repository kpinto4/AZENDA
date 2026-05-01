import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
export declare class PublicController {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
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
    }>;
    createBooking(slug: string, dto: CreatePublicAppointmentDto): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity>;
    confirmAttendance(slug: string, dto: ConfirmPublicAttendanceDto): Promise<import("../infrastructure/sql-db/sql-db.types").AppointmentEntity>;
    createStoreVisit(slug: string, dto: CreatePublicStoreVisitDto): Promise<import("../infrastructure/sql-db/sql-db.types").StoreVisitLogEntity>;
}
