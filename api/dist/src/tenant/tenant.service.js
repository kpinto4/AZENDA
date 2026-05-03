"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
let TenantService = class TenantService {
    constructor(sqlDbService) {
        this.sqlDbService = sqlDbService;
    }
    async getTenantContext(currentUser) {
        if (currentUser.role === auth_types_1.UserRole.SUPER_ADMIN) {
            return {
                tenant: null,
                message: 'Super admin sin tenant fijo',
            };
        }
        if (!currentUser.tenantId) {
            throw new common_1.NotFoundException('Usuario sin tenant asignado');
        }
        const tenant = await this.sqlDbService.findTenantById(currentUser.tenantId);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        return { tenant };
    }
    async updateTenantSettings(currentUser, dto) {
        if (!currentUser.tenantId) {
            throw new common_1.NotFoundException('Usuario sin tenant asignado');
        }
        const updated = await this.sqlDbService.updateTenant(currentUser.tenantId, {
            manualBookingEnabled: dto.manualBookingEnabled,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        return { tenant: updated };
    }
    async listCatalog(currentUser) {
        const tenantId = this.requireTenantId(currentUser);
        const [products, services, branding] = await Promise.all([
            this.sqlDbService.listProductsByTenantId(tenantId),
            this.sqlDbService.listServicesByTenantId(tenantId),
            this.sqlDbService.getTenantBranding(tenantId),
        ]);
        return {
            products,
            services,
            branding,
        };
    }
    async getBillingStatus(currentUser) {
        const tenantId = this.requireTenantId(currentUser);
        const tenant = await this.sqlDbService.findTenantById(tenantId);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        const snapshot = await this.sqlDbService.getTenantBillingSnapshot(tenantId);
        return {
            tenantId,
            plan: tenant.plan,
            status: tenant.status,
            subscriptionStartedAt: tenant.subscriptionStartedAt,
            billing: snapshot,
        };
    }
    async simulateUpgrade(currentUser, dto) {
        const tenantId = this.requireTenantId(currentUser);
        const quote = await this.sqlDbService.getUpgradeQuote({
            tenantId,
            targetPlan: dto.targetPlan,
            targetCycle: dto.targetCycle,
        });
        if (!quote) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        return quote;
    }
    async createProduct(currentUser, dto) {
        const tenantId = this.requireTenantId(currentUser);
        return this.sqlDbService.createTenantProduct(tenantId, {
            name: dto.name,
            description: dto.description ?? null,
            price: dto.price,
            promoPrice: dto.promoPrice ?? null,
            sku: dto.sku,
            stock: dto.stock,
            imageUrl: dto.imageUrl ?? null,
        });
    }
    async updateProduct(currentUser, productId, dto) {
        const tenantId = this.requireTenantId(currentUser);
        const row = await this.sqlDbService.updateTenantProduct(tenantId, productId, {
            name: dto.name,
            description: dto.description,
            price: dto.price,
            promoPrice: dto.promoPrice,
            sku: dto.sku,
            stock: dto.stock,
            imageUrl: dto.imageUrl,
        });
        if (!row) {
            throw new common_1.NotFoundException('Producto no encontrado');
        }
        return row;
    }
    async deleteProduct(currentUser, productId) {
        const tenantId = this.requireTenantId(currentUser);
        const ok = await this.sqlDbService.deleteTenantProduct(tenantId, productId);
        if (!ok) {
            throw new common_1.NotFoundException('Producto no encontrado');
        }
        return { ok: true };
    }
    async moveProduct(currentUser, productId, dto) {
        const tenantId = this.requireTenantId(currentUser);
        await this.sqlDbService.moveTenantProduct(tenantId, productId, dto.direction);
        return { ok: true };
    }
    async createService(currentUser, dto) {
        const tenantId = this.requireTenantId(currentUser);
        return this.sqlDbService.createTenantService(tenantId, {
            name: dto.name,
            description: dto.description ?? null,
            price: dto.price,
            promoPrice: dto.promoPrice ?? null,
            promoLabel: dto.promoLabel ?? null,
        });
    }
    async updateService(currentUser, serviceId, dto) {
        const tenantId = this.requireTenantId(currentUser);
        const row = await this.sqlDbService.updateTenantService(tenantId, serviceId, {
            name: dto.name,
            description: dto.description,
            price: dto.price,
            promoPrice: dto.promoPrice,
            promoLabel: dto.promoLabel,
        });
        if (!row) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        return row;
    }
    async deleteService(currentUser, serviceId) {
        const tenantId = this.requireTenantId(currentUser);
        const ok = await this.sqlDbService.deleteTenantService(tenantId, serviceId);
        if (!ok) {
            throw new common_1.NotFoundException('Servicio no encontrado');
        }
        return { ok: true };
    }
    async moveService(currentUser, serviceId, dto) {
        const tenantId = this.requireTenantId(currentUser);
        await this.sqlDbService.moveTenantService(tenantId, serviceId, dto.direction);
        return { ok: true };
    }
    async updateBranding(currentUser, dto) {
        const tenantId = this.requireTenantId(currentUser);
        return this.sqlDbService.updateTenantBranding(tenantId, dto);
    }
    async listEmployees(currentUser) {
        const tenantId = this.requireTenantId(currentUser);
        const users = await this.sqlDbService.listUsersByTenantId(tenantId);
        return users
            .filter((u) => u.role === auth_types_1.UserRole.ADMIN || u.role === auth_types_1.UserRole.EMPLEADO)
            .map((u) => ({
            id: u.id,
            name: u.email.split('@')[0],
            email: u.email,
            password: u.password,
            role: u.role === auth_types_1.UserRole.ADMIN ? 'ADMIN' : 'EMPLEADO',
            status: u.status,
        }));
    }
    async createEmployee(currentUser, dto) {
        const tenantId = this.requireTenantId(currentUser);
        const created = await this.sqlDbService.createUser({
            id: `usr_${Date.now()}`,
            email: dto.email.trim().toLowerCase(),
            password: dto.password?.trim() || 'azenda123',
            role: dto.role === 'ADMIN' ? auth_types_1.UserRole.ADMIN : auth_types_1.UserRole.EMPLEADO,
            tenantId,
            systems: dto.role === 'ADMIN' ? [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING] : [auth_types_1.AppSystem.TENANT],
            status: 'ACTIVE',
        });
        return {
            id: created.id,
            name: dto.name.trim(),
            email: created.email,
            password: created.password,
            role: created.role === auth_types_1.UserRole.ADMIN ? 'ADMIN' : 'EMPLEADO',
            status: created.status,
        };
    }
    async updateEmployee(currentUser, userId, dto) {
        const tenantId = this.requireTenantId(currentUser);
        const current = await this.sqlDbService.findUserById(userId);
        if (!current || current.tenantId !== tenantId) {
            throw new common_1.NotFoundException('Empleado no encontrado');
        }
        const role = dto.role
            ? dto.role === 'ADMIN'
                ? auth_types_1.UserRole.ADMIN
                : auth_types_1.UserRole.EMPLEADO
            : current.role;
        const updated = await this.sqlDbService.updateUser(userId, {
            email: dto.email?.trim().toLowerCase(),
            password: dto.password?.trim(),
            role,
            systems: role === auth_types_1.UserRole.ADMIN ? [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING] : [auth_types_1.AppSystem.TENANT],
        });
        if (!updated) {
            throw new common_1.NotFoundException('Empleado no encontrado');
        }
        return {
            id: updated.id,
            name: dto.name?.trim() || updated.email.split('@')[0],
            email: updated.email,
            password: updated.password,
            role: updated.role === auth_types_1.UserRole.ADMIN ? 'ADMIN' : 'EMPLEADO',
            status: updated.status,
        };
    }
    async deleteEmployee(currentUser, userId) {
        const tenantId = this.requireTenantId(currentUser);
        const ok = await this.sqlDbService.deleteUserByTenant(userId, tenantId);
        if (!ok) {
            throw new common_1.NotFoundException('Empleado no encontrado');
        }
        return { ok: true };
    }
    requireTenantId(currentUser) {
        if (!currentUser.tenantId) {
            throw new common_1.NotFoundException('Usuario sin tenant asignado');
        }
        return currentUser.tenantId;
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map