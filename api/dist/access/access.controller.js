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
exports.AccessController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
let AccessController = class AccessController {
    adminPing(req) {
        return {
            ok: true,
            area: 'admin',
            userId: req.user.id,
            role: req.user.role,
        };
    }
    tenantPing(req) {
        return {
            ok: true,
            area: 'tenant',
            userId: req.user.id,
            tenantId: req.user.tenantId,
            role: req.user.role,
        };
    }
};
exports.AccessController = AccessController;
__decorate([
    (0, common_1.Get)('admin/ping'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.SUPER_ADMIN),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.SUPER_ADMIN),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccessController.prototype, "adminPing", null);
__decorate([
    (0, common_1.Get)('tenant/ping'),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN, auth_types_1.UserRole.EMPLEADO),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.TENANT),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccessController.prototype, "tenantPing", null);
exports.AccessController = AccessController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], AccessController);
//# sourceMappingURL=access.controller.js.map