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
const appointment_booking_validation_util_1 = require("../common/appointment-booking-validation.util");
const public_booking_hours_util_1 = require("../common/public-booking-hours.util");
const appointment_scheduling_util_1 = require("../common/appointment-scheduling.util");
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
        const [services, users, appointments, branding] = await Promise.all([
            this.sqlDb.listServicesByTenantId(user.tenantId),
            this.sqlDb.listUsersByTenantId(user.tenantId),
            this.sqlDb.listAppointmentsByTenantId(user.tenantId),
            this.sqlDb.getTenantBranding(user.tenantId),
        ]);
        const employeeIds = (0, appointment_booking_validation_util_1.activeEmployeeIds)(users);
        if (!employeeIds.length) {
            throw new common_1.ForbiddenException('No hay profesionales activos para asignar la cita');
        }
        const datePart = dto.when.slice(0, 10);
        const timePart = dto.when.slice(11, 16);
        const durationMinutes = (0, appointment_booking_validation_util_1.resolveBookingDurationMinutes)(dto.service, services);
        try {
            (0, appointment_booking_validation_util_1.assertSlotWithinBusinessHours)(datePart, timePart, durationMinutes, branding.publicBookingHoursJson);
        }
        catch (e) {
            const code = e instanceof Error ? e.message : '';
            if (code === 'SLOT_CLOSED') {
                throw new common_1.ForbiddenException('Horario fuera de disponibilidad para ese dia');
            }
            if (code === 'SLOT_PAST_CLOSING') {
                throw new common_1.ForbiddenException('El servicio no cabe antes del cierre de ese dia. Elige otro horario.');
            }
            throw new common_1.BadRequestException('Horario invalido.');
        }
        const weekly = (0, public_booking_hours_util_1.parseWeeklyHoursJson)(branding.publicBookingHoursJson);
        const latestClose = (0, public_booking_hours_util_1.latestClosingMinuteForDate)(weekly, datePart);
        const intervals = (0, appointment_booking_validation_util_1.dayAppointmentIntervals)(appointments, services, datePart);
        const employeeId = dto.employeeId?.trim() ||
            (0, appointment_scheduling_util_1.readEmployeeIdFromServiceText)(dto.service) ||
            (user.role === auth_types_1.UserRole.EMPLEADO ? user.id : '');
        if (employeeId && !employeeIds.includes(employeeId)) {
            throw new common_1.ForbiddenException('Empleado invalido o no disponible para este negocio');
        }
        const picked = (0, appointment_booking_validation_util_1.pickEmployeeForBookingSlot)(datePart, timePart, durationMinutes, employeeId, employeeIds, intervals, latestClose);
        if (!picked) {
            throw new common_1.ConflictException('Ese horario ya esta ocupado para el profesional elegido. Elige otro horario.');
        }
        const service = (0, appointment_booking_validation_util_1.appendEmployeeToServiceLabel)(dto.service, picked);
        return this.sqlDb.createAppointment({
            tenantId: user.tenantId,
            customer: dto.customer,
            service,
            when: dto.when,
            status: 'pendiente',
            durationMinutes,
        });
    }
    patchStatus(user, appointmentId, dto) {
        this.requireTenantUser(user);
        void appointmentId;
        void dto;
        throw new common_1.ForbiddenException('Usa cancelar cita o actualizar asistencia; el estado se deriva de la asistencia');
    }
    async cancelForUser(user, appointmentId) {
        this.requireTenantUser(user);
        const current = await this.sqlDb.findAppointmentById(appointmentId);
        if (!current || current.tenantId !== user.tenantId) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        if (current.status === 'cancelada') {
            throw new common_1.BadRequestException('La cita ya estaba cancelada');
        }
        const updated = await this.sqlDb.updateAppointmentStatus(appointmentId, user.tenantId, 'cancelada');
        if (!updated) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        return updated;
    }
    async patchAttendance(user, appointmentId, dto) {
        this.requireTenantUser(user);
        const updated = await this.sqlDb.updateAppointmentAttendance(appointmentId, user.tenantId, dto.attendance);
        if (!updated) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        return updated;
    }
    async markManualReminderSent(user, appointmentId) {
        this.requireTenantUser(user);
        const updated = await this.sqlDb.markAppointmentReminderSentForTenant(appointmentId, user.tenantId);
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