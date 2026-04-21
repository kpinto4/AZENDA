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
    getTenantContext(currentUser) {
        if (currentUser.role === auth_types_1.UserRole.SUPER_ADMIN) {
            return {
                tenant: null,
                message: 'Super admin sin tenant fijo',
            };
        }
        if (!currentUser.tenantId) {
            throw new common_1.NotFoundException('Usuario sin tenant asignado');
        }
        const tenant = this.sqlDbService.findTenantById(currentUser.tenantId);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        return { tenant };
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map