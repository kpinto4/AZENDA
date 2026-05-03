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
exports.TenantStatusGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth.types");
const sql_db_service_1 = require("../../infrastructure/sql-db/sql-db.service");
let TenantStatusGuard = class TenantStatusGuard {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user || user.role === auth_types_1.UserRole.SUPER_ADMIN || !user.tenantId) {
            return true;
        }
        const isAllowedInRestrictedTenant = (req.method === 'GET' && req.path.endsWith('/tenant/context')) ||
            (req.method === 'GET' && req.path.endsWith('/tenant/billing/status')) ||
            (req.method === 'POST' && req.path.endsWith('/tenant/billing/upgrade-quote'));
        if (isAllowedInRestrictedTenant) {
            return true;
        }
        const tenant = await this.sqlDb.findTenantById(user.tenantId);
        if (!tenant) {
            throw new common_1.ForbiddenException('Tenant no disponible');
        }
        if (tenant.status === 'ACTIVE') {
            return true;
        }
        const statusLabel = tenant.status === 'PAUSED' ? 'PAUSADO' : 'BLOQUEADO';
        throw new common_1.ForbiddenException(`Tu negocio esta ${statusLabel}. Contacta a soporte o a tu administrador para reactivarlo.`);
    }
};
exports.TenantStatusGuard = TenantStatusGuard;
exports.TenantStatusGuard = TenantStatusGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], TenantStatusGuard);
//# sourceMappingURL=tenant-status.guard.js.map