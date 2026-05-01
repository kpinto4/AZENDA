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
exports.TenantAppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
let TenantAppointmentsService = class TenantAppointmentsService {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }
    async listForUser(user) {
        this.requireTenantUser(user);
        return this.sqlDb.listAppointmentsByTenantId(user.tenantId);
    }
    async createForUser(user, dto) {
        this.requireTenantUser(user);
        const tenant = await this.sqlDb.findTenantById(user.tenantId);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        if (!tenant.modules.citas) {
            throw new common_1.ForbiddenException('El modulo de citas no esta activo para este tenant');
        }
        if (!tenant.manualBookingEnabled) {
            throw new common_1.ForbiddenException('La creacion manual de citas esta desactivada en configuracion del negocio');
        }
        const conflict = await this.sqlDb.findAppointmentByTenantAndWhen(user.tenantId, dto.when);
        if (conflict) {
            throw new common_1.ConflictException('Ya existe una cita en ese mismo dia y hora. Elige otro horario.');
        }
        return this.sqlDb.createAppointment({
            tenantId: user.tenantId,
            customer: dto.customer,
            service: dto.service,
            when: dto.when,
            status: 'pendiente',
        });
    }
    patchStatus(user, appointmentId, dto) {
        this.requireTenantUser(user);
        void appointmentId;
        void dto;
        throw new common_1.ForbiddenException('El estado se calcula automaticamente segun la asistencia');
    }
    async patchAttendance(user, appointmentId, dto) {
        this.requireTenantUser(user);
        const updated = await this.sqlDb.updateAppointmentAttendance(appointmentId, user.tenantId, dto.attendance);
        if (!updated) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        return updated;
    }
    requireTenantUser(user) {
        if (user.role === auth_types_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Usa el panel tenant con un usuario de negocio');
        }
        if (!user.tenantId) {
            throw new common_1.ForbiddenException('Usuario sin tenant');
        }
    }
};
exports.TenantAppointmentsService = TenantAppointmentsService;
exports.TenantAppointmentsService = TenantAppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], TenantAppointmentsService);
//# sourceMappingURL=tenant-appointments.service.js.map