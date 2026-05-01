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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTenantsController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const create_tenant_dto_1 = require("./dto/create-tenant.dto");
const update_tenant_dto_1 = require("./dto/update-tenant.dto");
let AdminTenantsController = class AdminTenantsController {
    constructor(sqlDbService) {
        this.sqlDbService = sqlDbService;
    }
    listTenants() {
        return this.sqlDbService.listTenants();
    }
    async getTenantById(tenantId) {
        const tenant = await this.sqlDbService.findTenantById(tenantId);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        return tenant;
    }
    createTenant(body) {
        return this.sqlDbService.createTenant({
            id: body.id,
            name: body.name,
            slug: body.slug,
            status: body.status,
            plan: body.plan ?? 'Trial',
            storefrontEnabled: body.storefrontEnabled ?? false,
            manualBookingEnabled: body.manualBookingEnabled ?? true,
            modules: {
                citas: body.citas ?? true,
                ventas: body.ventas ?? true,
                inventario: body.inventario ?? false,
            },
        });
    }
    async updateTenant(tenantId, body) {
        const modPatch = {};
        if (body.citas !== undefined) {
            modPatch.citas = body.citas;
        }
        if (body.ventas !== undefined) {
            modPatch.ventas = body.ventas;
        }
        if (body.inventario !== undefined) {
            modPatch.inventario = body.inventario;
        }
        const updated = await this.sqlDbService.updateTenant(tenantId, {
            name: body.name,
            slug: body.slug,
            status: body.status,
            plan: body.plan,
            storefrontEnabled: body.storefrontEnabled,
            manualBookingEnabled: body.manualBookingEnabled,
            ...(Object.keys(modPatch).length ? { modules: modPatch } : {}),
        });
        if (!updated) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        return updated;
    }
    async deleteTenant(tenantId) {
        const deleted = await this.sqlDbService.deleteTenant(tenantId);
        if (!deleted) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
    }
};
exports.AdminTenantsController = AdminTenantsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminTenantsController.prototype, "listTenants", null);
__decorate([
    (0, common_1.Get)(':tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminTenantsController.prototype, "getTenantById", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tenant_dto_1.CreateTenantDto]),
    __metadata("design:returntype", void 0)
], AdminTenantsController.prototype, "createTenant", null);
__decorate([
    (0, common_1.Patch)(':tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_tenant_dto_1.UpdateTenantDto]),
    __metadata("design:returntype", Promise)
], AdminTenantsController.prototype, "updateTenant", null);
__decorate([
    (0, common_1.Delete)(':tenantId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminTenantsController.prototype, "deleteTenant", null);
exports.AdminTenantsController = AdminTenantsController = __decorate([
    (0, common_1.Controller)('admin/tenants'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.SUPER_ADMIN),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.SUPER_ADMIN),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], AdminTenantsController);
//# sourceMappingURL=admin-tenants.controller.js.map