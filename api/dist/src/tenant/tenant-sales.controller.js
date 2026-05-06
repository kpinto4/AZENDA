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
exports.TenantSalesController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_status_guard_1 = require("../auth/guards/tenant-status.guard");
const create_tenant_sale_dto_1 = require("./dto/create-tenant-sale.dto");
const tenant_sales_service_1 = require("./tenant-sales.service");
let TenantSalesController = class TenantSalesController {
    constructor(tenantSales) {
        this.tenantSales = tenantSales;
    }
    list(req) {
        return this.tenantSales.list(req.user);
    }
    create(req, dto) {
        return this.tenantSales.create(req.user, dto);
    }
};
exports.TenantSalesController = TenantSalesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantSalesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_tenant_sale_dto_1.CreateTenantSaleDto]),
    __metadata("design:returntype", void 0)
], TenantSalesController.prototype, "create", null);
exports.TenantSalesController = TenantSalesController = __decorate([
    (0, common_1.Controller)('tenant/ventas'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, tenant_status_guard_1.TenantStatusGuard),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN, auth_types_1.UserRole.EMPLEADO),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.TENANT),
    __metadata("design:paramtypes", [tenant_sales_service_1.TenantSalesService])
], TenantSalesController);
//# sourceMappingURL=tenant-sales.controller.js.map