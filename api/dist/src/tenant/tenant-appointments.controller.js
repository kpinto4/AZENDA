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
exports.TenantAppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const systems_decorator_1 = require("../auth/decorators/systems.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_status_guard_1 = require("../auth/guards/tenant-status.guard");
const create_appointment_dto_1 = require("./dto/create-appointment.dto");
const patch_appointment_attendance_dto_1 = require("./dto/patch-appointment-attendance.dto");
const patch_appointment_status_dto_1 = require("./dto/patch-appointment-status.dto");
const tenant_appointments_service_1 = require("./tenant-appointments.service");
let TenantAppointmentsController = class TenantAppointmentsController {
    constructor(appointments) {
        this.appointments = appointments;
    }
    list(req) {
        return this.appointments.listForUser(req.user);
    }
    create(req, dto) {
        return this.appointments.createForUser(req.user, dto);
    }
    patchStatus(req, appointmentId, dto) {
        return this.appointments.patchStatus(req.user, appointmentId, dto);
    }
    patchAttendance(req, appointmentId, dto) {
        return this.appointments.patchAttendance(req.user, appointmentId, dto);
    }
};
exports.TenantAppointmentsController = TenantAppointmentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantAppointmentsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_appointment_dto_1.CreateAppointmentDto]),
    __metadata("design:returntype", void 0)
], TenantAppointmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':appointmentId/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('appointmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, patch_appointment_status_dto_1.PatchAppointmentStatusDto]),
    __metadata("design:returntype", void 0)
], TenantAppointmentsController.prototype, "patchStatus", null);
__decorate([
    (0, common_1.Patch)(':appointmentId/attendance'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('appointmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, patch_appointment_attendance_dto_1.PatchAppointmentAttendanceDto]),
    __metadata("design:returntype", void 0)
], TenantAppointmentsController.prototype, "patchAttendance", null);
exports.TenantAppointmentsController = TenantAppointmentsController = __decorate([
    (0, common_1.Controller)('tenant/appointments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, tenant_status_guard_1.TenantStatusGuard),
    (0, roles_decorator_1.Roles)(auth_types_1.UserRole.ADMIN, auth_types_1.UserRole.EMPLEADO),
    (0, systems_decorator_1.Systems)(auth_types_1.AppSystem.TENANT),
    __metadata("design:paramtypes", [tenant_appointments_service_1.TenantAppointmentsService])
], TenantAppointmentsController);
//# sourceMappingURL=tenant-appointments.controller.js.map