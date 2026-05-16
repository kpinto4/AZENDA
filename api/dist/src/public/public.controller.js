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
const throttler_1 = require("@nestjs/throttler");
const confirm_public_attendance_dto_1 = require("./dto/confirm-public-attendance.dto");
const create_public_appointment_dto_1 = require("./dto/create-public-appointment.dto");
const create_public_store_visit_dto_1 = require("./dto/create-public-store-visit.dto");
const lookup_public_appointments_dto_1 = require("./dto/lookup-public-appointments.dto");
const reschedule_public_appointment_dto_1 = require("./dto/reschedule-public-appointment.dto");
const public_booking_service_1 = require("./public-booking.service");
let PublicController = class PublicController {
    constructor(booking) {
        this.booking = booking;
    }
    getSiteConfig() {
        return this.booking.getSiteConfig();
    }
    getPublicMeta(slug) {
        return this.booking.getPublicMeta(slug);
    }
    getPublicCatalog(slug) {
        return this.booking.getPublicCatalog(slug);
    }
    getPublicAvailability(slug, date) {
        return this.booking.getPublicAvailability(slug, date);
    }
    createBooking(slug, dto) {
        return this.booking.createBooking(slug, dto);
    }
    reprogramarCita(slug, dto) {
        return this.booking.reprogramarCita(slug, dto);
    }
    confirmAttendance(slug, dto) {
        return this.booking.confirmAttendance(slug, dto);
    }
    buscarCitasActivas(slug, dto) {
        return this.booking.buscarCitasActivas(slug, dto);
    }
    createStoreVisit(slug, dto) {
        return this.booking.createStoreVisit(slug, dto);
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
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getPublicMeta", null);
__decorate([
    (0, common_1.Get)(':slug/catalog'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getPublicCatalog", null);
__decorate([
    (0, common_1.Get)(':slug/availability'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getPublicAvailability", null);
__decorate([
    (0, common_1.Post)(':slug/appointments'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_public_appointment_dto_1.CreatePublicAppointmentDto]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Post)(':slug/reprogramar-cita'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reschedule_public_appointment_dto_1.ReschedulePublicAppointmentDto]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "reprogramarCita", null);
__decorate([
    (0, common_1.Post)(':slug/confirmar-asistencia'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, confirm_public_attendance_dto_1.ConfirmPublicAttendanceDto]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "confirmAttendance", null);
__decorate([
    (0, common_1.Post)(':slug/buscar-citas'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, lookup_public_appointments_dto_1.LookupPublicAppointmentsDto]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "buscarCitasActivas", null);
__decorate([
    (0, common_1.Post)(':slug/registro-tienda'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_public_store_visit_dto_1.CreatePublicStoreVisitDto]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "createStoreVisit", null);
exports.PublicController = PublicController = __decorate([
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }),
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [public_booking_service_1.PublicBookingService])
], PublicController);
//# sourceMappingURL=public.controller.js.map