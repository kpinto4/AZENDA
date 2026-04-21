import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
export declare class PublicController {
    private readonly sqlDb;
    constructor(sqlDb: SqlDbService);
    getPublicMeta(slug: string): {
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
    };
    createBooking(slug: string, dto: CreatePublicAppointmentDto): import("../infrastructure/sql-db/sql-db.types").AppointmentEntity;
    confirmAttendance(slug: string, dto: ConfirmPublicAttendanceDto): import("../infrastructure/sql-db/sql-db.types").AppointmentEntity;
    createStoreVisit(slug: string, dto: CreatePublicStoreVisitDto): import("../infrastructure/sql-db/sql-db.types").StoreVisitLogEntity;
}
