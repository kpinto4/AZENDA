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
exports.TenantStoreVisitsController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_status_guard_1 = require("../auth/guards/tenant-status.guard");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
let TenantStoreVisitsController = class TenantStoreVisitsController {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }
    async list(req) {
        const user = req.user;
        if (!user.tenantId) {
            throw new common_1.ForbiddenException('Usuario sin tenant');
        }
        const tenant = await this.sqlDb.findTenantById(user.tenantId);
        if (!tenant?.modules.ventas) {
            throw new common_1.ForbiddenException('El modulo de ventas no esta activo para este tenant');
        }
        return this.sqlDb.listStoreVisitsByTenantId(user.tenantId);
    }
};
exports.TenantStoreVisitsController = TenantStoreVisitsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantStoreVisitsController.prototype, "list", null);
exports.TenantStoreVisitsController = TenantStoreVisitsController = __decorate([
    (0, common_1.Controller)('tenant/tienda-registros'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, tenant_status_guard_1.TenantStatusGuard),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN, auth_types_1.UserRole.EMPLEADO),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.TENANT),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], TenantStoreVisitsController);
//# sourceMappingURL=tenant-store-visits.controller.js.map