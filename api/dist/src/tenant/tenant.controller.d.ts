import { Request } from 'express';
import { AuthUser } from '../auth/auth.types';
import { MoveCatalogItemDto } from './dto/move-catalog-item.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { CreateTenantEmployeeDto } from './dto/create-tenant-employee.dto';
import { UpdateTenantEmployeeDto } from './dto/update-tenant-employee.dto';
import { UpsertTenantProductDto } from './dto/upsert-tenant-product.dto';
import { UpsertTenantServiceDto } from './dto/upsert-tenant-service.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { SimulateUpgradeDto } from './dto/simulate-upgrade.dto';
import { TenantService } from './tenant.service';
type AuthenticatedRequest = Request & {
    user: AuthUser;
};
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    getTenantContext(req: AuthenticatedRequest): Promise<{
        tenant: null;
        message: string;
    } | {
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
        message?: undefined;
    }>;
    updateSettings(req: AuthenticatedRequest, dto: UpdateTenantSettingsDto): Promise<{
        tenant: import("../infrastructure/sql-db/sql-db.types").TenantEntity;
    }>;
    getCatalog(req: AuthenticatedRequest): Promise<{
        products: import("../infrastructure/sql-db/sql-db.types").TenantProductEntity[];
        services: import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity[];
        branding: import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity;
    }>;
    getBillingStatus(req: AuthenticatedRequest): Promise<{
        tenantId: string;
        plan: string;
        status: "ACTIVE" | "PAUSED" | "BLOCKED";
        subscriptionStartedAt: string;
        billing: import("../infrastructure/sql-db/sql-db.types").TenantBillingSnapshot | undefined;
    }>;
    getUpgradeQuote(req: AuthenticatedRequest, dto: SimulateUpgradeDto): Promise<{
        tenantId: string;
        currentPlan: string;
        targetPlan: string;
        currentCycle: import("../infrastructure/sql-db/sql-db.types").BillingCycle;
        targetCycle: import("../infrastructure/sql-db/sql-db.types").BillingCycle;
        period: {
            start: string;
            end: string;
            totalDays: number;
            remainingDays: number;
        };
        creditAmount: number;
        targetCostForRemaining: number;
        amountDueNow: number;
        carryOverBalance: number;
    }>;
    createProduct(req: AuthenticatedRequest, dto: UpsertTenantProductDto): Promise<import("../infrastructure/sql-db/sql-db.types").TenantProductEntity>;
    updateProduct(req: AuthenticatedRequest, productId: string, dto: UpsertTenantProductDto): Promise<import("../infrastructure/sql-db/sql-db.types").TenantProductEntity>;
    deleteProduct(req: AuthenticatedRequest, productId: string): Promise<{
        ok: boolean;
    }>;
    moveProduct(req: AuthenticatedRequest, productId: string, dto: MoveCatalogItemDto): Promise<{
        ok: boolean;
    }>;
    createService(req: AuthenticatedRequest, dto: UpsertTenantServiceDto): Promise<import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity>;
    updateService(req: AuthenticatedRequest, serviceId: string, dto: UpsertTenantServiceDto): Promise<import("../infrastructure/sql-db/sql-db.types").TenantServiceEntity>;
    deleteService(req: AuthenticatedRequest, serviceId: string): Promise<{
        ok: boolean;
    }>;
    moveService(req: AuthenticatedRequest, serviceId: string, dto: MoveCatalogItemDto): Promise<{
        ok: boolean;
    }>;
    updateBranding(req: AuthenticatedRequest, dto: UpdateTenantBrandingDto): Promise<import("../infrastructure/sql-db/sql-db.types").TenantBrandingEntity>;
    listEmployees(req: AuthenticatedRequest): Promise<{
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    }[]>;
    createEmployee(req: AuthenticatedRequest, dto: CreateTenantEmployeeDto): Promise<{
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    }>;
    updateEmployee(req: AuthenticatedRequest, userId: string, dto: UpdateTenantEmployeeDto): Promise<{
        id: string;
        name: string;
        email: string;
        password: string;
        role: string;
        status: import("../auth/auth.types").UserStatus;
    }>;
    deleteEmployee(req: AuthenticatedRequest, userId: string): Promise<{
        ok: boolean;
    }>;
}
export {};
