"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BookingNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingNotificationService = void 0;
const common_1 = require("@nestjs/common");
let BookingNotificationService = BookingNotificationService_1 = class BookingNotificationService {
    constructor() {
        this.logger = new common_1.Logger(BookingNotificationService_1.name);
    }
    async onBookingCreated(payload) {
        const notifyTo = process.env.BOOKING_NOTIFY_EMAIL?.trim();
        const line = `Reserva ${payload.appointmentId} · ${payload.tenantName} (${payload.tenantSlug}) · ${payload.customer} · ${payload.when} · ${payload.service}`;
        if (!notifyTo) {
            this.logger.log(line);
            return;
        }
        this.logger.log(`${line} · notificación operativa → ${notifyTo} (SMTP transaccional pendiente de proveedor)`);
    }
};
exports.BookingNotificationService = BookingNotificationService;
exports.BookingNotificationService = BookingNotificationService = BookingNotificationService_1 = __decorate([
    (0, common_1.Injectable)()
], BookingNotificationService);
//# sourceMappingURL=booking-notification.service.js.map