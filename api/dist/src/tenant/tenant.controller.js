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
exports.TenantController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_status_guard_1 = require("../auth/guards/tenant-status.guard");
const move_catalog_item_dto_1 = require("./dto/move-catalog-item.dto");
const update_tenant_branding_dto_1 = require("./dto/update-tenant-branding.dto");
const create_tenant_employee_dto_1 = require("./dto/create-tenant-employee.dto");
const update_tenant_employee_dto_1 = require("./dto/update-tenant-employee.dto");
const upsert_tenant_product_dto_1 = require("./dto/upsert-tenant-product.dto");
const upsert_tenant_service_dto_1 = require("./dto/upsert-tenant-service.dto");
const update_tenant_settings_dto_1 = require("./dto/update-tenant-settings.dto");
const tenant_service_1 = require("./tenant.service");
let TenantController = class TenantController {
    constructor(tenantService) {
        this.tenantService = tenantService;
    }
    getTenantContext(req) {
        return this.tenantService.getTenantContext(req.user);
    }
    updateSettings(req, dto) {
        return this.tenantService.updateTenantSettings(req.user, dto);
    }
    getCatalog(req) {
        return this.tenantService.listCatalog(req.user);
    }
    createProduct(req, dto) {
        return this.tenantService.createProduct(req.user, dto);
    }
    updateProduct(req, productId, dto) {
        return this.tenantService.updateProduct(req.user, productId, dto);
    }
    deleteProduct(req, productId) {
        return this.tenantService.deleteProduct(req.user, productId);
    }
    moveProduct(req, productId, dto) {
        return this.tenantService.moveProduct(req.user, productId, dto);
    }
    createService(req, dto) {
        return this.tenantService.createService(req.user, dto);
    }
    updateService(req, serviceId, dto) {
        return this.tenantService.updateService(req.user, serviceId, dto);
    }
    deleteService(req, serviceId) {
        return this.tenantService.deleteService(req.user, serviceId);
    }
    moveService(req, serviceId, dto) {
        return this.tenantService.moveService(req.user, serviceId, dto);
    }
    updateBranding(req, dto) {
        return this.tenantService.updateBranding(req.user, dto);
    }
    listEmployees(req) {
        return this.tenantService.listEmployees(req.user);
    }
    createEmployee(req, dto) {
        return this.tenantService.createEmployee(req.user, dto);
    }
    updateEmployee(req, userId, dto) {
        return this.tenantService.updateEmployee(req.user, userId, dto);
    }
    deleteEmployee(req, userId) {
        return this.tenantService.deleteEmployee(req.user, userId);
    }
};
exports.TenantController = TenantController;
__decorate([
    (0, common_1.Get)('context'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "getTenantContext", null);
__decorate([
    (0, common_1.Patch)('settings'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_tenant_settings_dto_1.UpdateTenantSettingsDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "getCatalog", null);
__decorate([
    (0, common_1.Post)('catalog/products'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_tenant_product_dto_1.UpsertTenantProductDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)('catalog/products/:productId'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_tenant_product_dto_1.UpsertTenantProductDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)('catalog/products/:productId'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Patch)('catalog/products/:productId/move'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, move_catalog_item_dto_1.MoveCatalogItemDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "moveProduct", null);
__decorate([
    (0, common_1.Post)('catalog/services'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_tenant_service_dto_1.UpsertTenantServiceDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "createService", null);
__decorate([
    (0, common_1.Patch)('catalog/services/:serviceId'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('serviceId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_tenant_service_dto_1.UpsertTenantServiceDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "updateService", null);
__decorate([
    (0, common_1.Delete)('catalog/services/:serviceId'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('serviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "deleteService", null);
__decorate([
    (0, common_1.Patch)('catalog/services/:serviceId/move'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('serviceId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, move_catalog_item_dto_1.MoveCatalogItemDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "moveService", null);
__decorate([
    (0, common_1.Patch)('branding'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_tenant_branding_dto_1.UpdateTenantBrandingDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "updateBranding", null);
__decorate([
    (0, common_1.Get)('employees'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "listEmployees", null);
__decorate([
    (0, common_1.Post)('employees'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_tenant_employee_dto_1.CreateTenantEmployeeDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Patch)('employees/:userId'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_tenant_employee_dto_1.UpdateTenantEmployeeDto]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Delete)('employees/:userId'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TenantController.prototype, "deleteEmployee", null);
exports.TenantController = TenantController = __decorate([
    (0, common_1.Controller)('tenant'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, tenant_status_guard_1.TenantStatusGuard),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.SUPER_ADMIN, auth_types_1.UserRole.ADMIN, auth_types_1.UserRole.EMPLEADO),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.TENANT),
    __metadata("design:paramtypes", [tenant_service_1.TenantService])
], TenantController);
//# sourceMappingURL=tenant.controller.js.map