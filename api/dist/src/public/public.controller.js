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
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const confirm_public_attendance_dto_1 = require("./dto/confirm-public-attendance.dto");
const create_public_appointment_dto_1 = require("./dto/create-public-appointment.dto");
const create_public_store_visit_dto_1 = require("./dto/create-public-store-visit.dto");
function catalogoPublicoActivo(t) {
    const planOk = t.plan === 'Pro' || t.plan === 'Negocio';
    return (planOk &&
        t.storefrontEnabled &&
        t.modules.inventario &&
        t.modules.ventas &&
        t.status === 'ACTIVE');
}
let PublicController = class PublicController {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }
    getSiteConfig() {
        return this.sqlDb.getPlatformSiteConfig();
    }
    async getPublicMeta(slug) {
        const tenant = await this.sqlDb.findTenantBySlug(slug);
        if (!tenant) {
            throw new common_1.NotFoundException('Negocio no encontrado');
        }
        const active = tenant.status === 'ACTIVE';
        const branding = await this.sqlDb.getTenantBranding(tenant.id);
        return {
            slug: tenant.slug,
            name: tenant.name,
            active,
            plan: tenant.plan,
            modules: tenant.modules,
            storefrontEnabled: tenant.storefrontEnabled,
            catalogoActivo: active && catalogoPublicoActivo(tenant),
            branding,
        };
    }
    async getPublicCatalog(slug) {
        const tenant = await this.sqlDb.findTenantBySlug(slug);
        if (!tenant) {
            throw new common_1.NotFoundException('Negocio no encontrado');
        }
        const [products, services, branding] = await Promise.all([
            this.sqlDb.listProductsByTenantId(tenant.id),
            this.sqlDb.listServicesByTenantId(tenant.id),
            this.sqlDb.getTenantBranding(tenant.id),
        ]);
        return {
            products,
            services,
            branding,
        };
    }
    async createBooking(slug, dto) {
        const tenant = await this.sqlDb.findTenantBySlug(slug);
        if (!tenant) {
            throw new common_1.NotFoundException('Negocio no encontrado');
        }
        if (tenant.status !== 'ACTIVE') {
            throw new common_1.ForbiddenException('Este negocio no acepta reservas publicas en este momento');
        }
        if (!tenant.modules.citas) {
            throw new common_1.ForbiddenException('Reservas no disponibles para este negocio');
        }
        const conflict = await this.sqlDb.findAppointmentByTenantAndWhen(tenant.id, dto.when);
        if (conflict) {
            throw new common_1.ConflictException('Ese horario ya fue tomado por otra cita. Elige otro horario.');
        }
        return this.sqlDb.createAppointment({
            tenantId: tenant.id,
            customer: dto.customer,
            service: dto.service,
            when: dto.when,
            status: 'pendiente',
        });
    }
    async confirmAttendance(slug, dto) {
        const updated = await this.sqlDb.confirmPublicAppointmentAttendance(slug, dto.appointmentId, dto.customer);
        if (!updated) {
            throw new common_1.NotFoundException('No se pudo registrar la asistencia. Revisa referencia y nombre.');
        }
        return updated;
    }
    async createStoreVisit(slug, dto) {
        const tenant = await this.sqlDb.findTenantBySlug(slug);
        if (!tenant) {
            throw new common_1.NotFoundException('Negocio no encontrado');
        }
        if (tenant.status !== 'ACTIVE') {
            throw new common_1.ForbiddenException('Este enlace no esta disponible en este momento');
        }
        if (!tenant.modules.ventas) {
            throw new common_1.ForbiddenException('Registro de tienda no disponible para este negocio');
        }
        return this.sqlDb.createStoreVisitLog({
            tenantId: tenant.id,
            customer: dto.customer,
            detail: dto.detail,
        });
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)('site-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getSiteConfig", null);
__decorate([
    (0, common_1.Get)(':slug/meta'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getPublicMeta", null);
__decorate([
    (0, common_1.Get)(':slug/catalog'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getPublicCatalog", null);
__decorate([
    (0, common_1.Post)(':slug/appointments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_public_appointment_dto_1.CreatePublicAppointmentDto]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Post)(':slug/confirmar-asistencia'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, confirm_public_attendance_dto_1.ConfirmPublicAttendanceDto]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "confirmAttendance", null);
__decorate([
    (0, common_1.Post)(':slug/registro-tienda'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_public_store_visit_dto_1.CreatePublicStoreVisitDto]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "createStoreVisit", null);
exports.PublicController = PublicController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], PublicController);
//# sourceMappingURL=public.controller.js.map