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
exports.AdminPlanCatalogController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const replace_plan_catalog_dto_1 = require("./dto/replace-plan-catalog.dto");
let AdminPlanCatalogController = class AdminPlanCatalogController {
    constructor(sqlDbService) {
        this.sqlDbService = sqlDbService;
    }
    list() {
        return this.sqlDbService.listPlanCatalog();
    }
    replace(body) {
        return this.sqlDbService.replacePlanCatalog(body.entries.map((e) => ({
            planKey: e.planKey,
            priceMonthly: e.priceMonthly,
            priceYearly: e.priceYearly,
        })));
    }
};
exports.AdminPlanCatalogController = AdminPlanCatalogController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminPlanCatalogController.prototype, "list", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [replace_plan_catalog_dto_1.ReplacePlanCatalogDto]),
    __metadata("design:returntype", void 0)
], AdminPlanCatalogController.prototype, "replace", null);
exports.AdminPlanCatalogController = AdminPlanCatalogController = __decorate([
    (0, common_1.Controller)('admin/plan-catalog'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.SUPER_ADMIN),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.SUPER_ADMIN),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], AdminPlanCatalogController);
//# sourceMappingURL=admin-plan-catalog.controller.js.map