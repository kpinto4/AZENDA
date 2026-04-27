import { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { MoveCatalogItemDto } from './dto/move-catalog-item.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { CreateTenantEmployeeDto } from './dto/create-tenant-employee.dto';
import { UpdateTenantEmployeeDto } from './dto/update-tenant-employee.dto';
import { UpsertTenantProductDto } from './dto/upsert-tenant-product.dto';
import { UpsertTenantServiceDto } from './dto/upsert-tenant-service.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { TenantService } from './tenant.service';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    getTenantContext(req: AuthenticatedRequest): {
        tenant: null;
        message: string;
    } | {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
        message?: undefined;
    };
    updateSettings(req: AuthenticatedRequest, dto: UpdateTenantSettingsDto): {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
    };
    getCatalog(req: AuthenticatedRequest): {
        products: import("../infrastructure/sql-db/sql-db.types").TenantProductEntity[];
        services: import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity[];
        branding: import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
    };
    createProduct(req: AuthenticatedRequest, dto: UpsertTenantProductDto): import("../infrastructure/sql-db/sql-db.types").TenantProductEntity;
    updateProduct(req: AuthenticatedRequest, productId: string, dto: UpsertTenantProductDto): import("../infrastructure/sql-db/sql-db.types").TenantProductEntity;
    deleteProduct(req: AuthenticatedRequest, productId: string): {
        ok: boolean;
    };
    moveProduct(req: AuthenticatedRequest, productId: string, dto: MoveCatalogItemDto): {
        ok: boolean;
    };
    createService(req: AuthenticatedRequest, dto: UpsertTenantServiceDto): import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity;
    updateService(req: AuthenticatedRequest, serviceId: string, dto: UpsertTenantServiceDto): import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity;
    deleteService(req: AuthenticatedRequest, serviceId: string): {
        ok: boolean;
    };
    moveService(req: AuthenticatedRequest, serviceId: string, dto: MoveCatalogItemDto): {
        ok: boolean;
    };
    updateBranding(req: AuthenticatedRequest, dto: UpdateTenantBrandingDto): import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
    listEmployees(req: AuthenticatedRequest): {
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    }[];
    createEmployee(req: AuthenticatedRequest, dto: CreateTenantEmployeeDto): {
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    };
    updateEmployee(req: AuthenticatedRequest, userId: string, dto: UpdateTenantEmployeeDto): {
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    };
    deleteEmployee(req: AuthenticatedRequest, userId: string): {
        ok: boolean;
    };
}
export {};
