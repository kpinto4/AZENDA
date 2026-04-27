import { AuthUser } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { CreateTenantEmployeeDto } from './dto/create-tenant-employee.dto';
import { MoveCatalogItemDto } from './dto/move-catalog-item.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { UpdateTenantEmployeeDto } from './dto/update-tenant-employee.dto';
import { UpsertTenantProductDto } from './dto/upsert-tenant-product.dto';
import { UpsertTenantServiceDto } from './dto/upsert-tenant-service.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
export declare class TenantService {
    private readonly sqlDbService;
    constructor(sqlDbService: SqlDbService);
    getTenantContext(currentUser: AuthUser): {
        tenant: null;
        message: string;
    } | {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
        message?: undefined;
    };
    updateTenantSettings(currentUser: AuthUser, dto: UpdateTenantSettingsDto): {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
    };
    listCatalog(currentUser: AuthUser): {
        products: import("../infrastructure/sql-db/sql-db.types").TenantProductEntity[];
        services: import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity[];
        branding: import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
    };
    createProduct(currentUser: AuthUser, dto: UpsertTenantProductDto): import("../infrastructure/sql-db/sql-db.types").TenantProductEntity;
    updateProduct(currentUser: AuthUser, productId: string, dto: UpsertTenantProductDto): import("../infrastructure/sql-db/sql-db.types").TenantProductEntity;
    deleteProduct(currentUser: AuthUser, productId: string): {
        ok: boolean;
    };
    moveProduct(currentUser: AuthUser, productId: string, dto: MoveCatalogItemDto): {
        ok: boolean;
    };
    createService(currentUser: AuthUser, dto: UpsertTenantServiceDto): import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity;
    updateService(currentUser: AuthUser, serviceId: string, dto: UpsertTenantServiceDto): import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity;
    deleteService(currentUser: AuthUser, serviceId: string): {
        ok: boolean;
    };
    moveService(currentUser: AuthUser, serviceId: string, dto: MoveCatalogItemDto): {
        ok: boolean;
    };
    updateBranding(currentUser: AuthUser, dto: UpdateTenantBrandingDto): import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
    listEmployees(currentUser: AuthUser): {
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    }[];
    createEmployee(currentUser: AuthUser, dto: CreateTenantEmployeeDto): {
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    };
    updateEmployee(currentUser: AuthUser, userId: string, dto: UpdateTenantEmployeeDto): {
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    };
    deleteEmployee(currentUser: AuthUser, userId: string): {
        ok: boolean;
    };
    private requireTenantId;
}
