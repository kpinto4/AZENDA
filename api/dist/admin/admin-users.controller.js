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
exports.AdminUsersController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
let AdminUsersController = class AdminUsersController {
    constructor(sqlDbService) {
        this.sqlDbService = sqlDbService;
    }
    listUsers() {
        return this.sqlDbService.listUsers().map((user) => {
            const { password: _password, ...safeUser } = user;
            return safeUser;
        });
    }
    getUserById(userId) {
        const user = this.sqlDbService.findUserById(userId);
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const { password: _password, ...safeUser } = user;
        return safeUser;
    }
    createUser(body) {
        const created = this.sqlDbService.createUser({
            id: body.id,
            email: body.email,
            password: body.password,
            role: body.role,
            tenantId: body.tenantId ?? null,
            systems: body.systems,
            status: body.status,
        });
        const { password: _password, ...safeUser } = created;
        return safeUser;
    }
    updateUser(userId, body) {
        const updated = this.sqlDbService.updateUser(userId, {
            email: body.email,
            password: body.password,
            role: body.role,
            tenantId: body.tenantId,
            systems: body.systems,
            status: body.status,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const { password: _password, ...safeUser } = updated;
        return safeUser;
    }
    deleteUser(userId) {
        const deleted = this.sqlDbService.deleteUser(userId);
        if (!deleted) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
    }
};
exports.AdminUsersController = AdminUsersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "createUser", null);
__decorate([
    (0, common_1.Patch)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)(':userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "deleteUser", null);
exports.AdminUsersController = AdminUsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.SUPER_ADMIN),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.SUPER_ADMIN),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], AdminUsersController);
//# sourceMappingURL=admin-users.controller.js.map