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
exports.PublicBookingService = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const appointment_scheduling_util_1 = require("../common/appointment-scheduling.util");
const customer_name_match_util_1 = require("../common/customer-name-match.util");
const phone_co_util_1 = require("../common/phone-co.util");
const public_booking_hours_util_1 = require("../common/public-booking-hours.util");
const service_duration_util_1 = require("../common/service-duration.util");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const booking_notification_service_1 = require("./booking-notification.service");
function catalogoPublicoActivo(t) {
    const planOk = t.plan === 'Pro' || t.plan === 'Negocio';
    return (planOk &&
        t.storefrontEnabled &&
        t.modules.inventario &&
        t.modules.ventas &&
        t.status === 'ACTIVE');
}
function displayNameFromEmail(email) {
    const local = email.split('@')[0] ?? email;
    const normalized = local.replace(/[._-]+/g, ' ').trim();
    if (!normalized) {
        return 'Profesional';
    }
    return normalized
        .split(' ')
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}
function parseYmd(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m) {
        return null;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
        return null;
    }
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y ||
        dt.getMonth() !== mo - 1 ||
        dt.getDate() !== d) {
        return null;
    }
    return dt;
}
function ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
const PUBLIC_RESCHEDULE_MIN_LEAD_MS = 90 * 60 * 1000;
function publicServiceLabelForLookup(service) {
    const s = service == null ? '' : String(service);
    const marker = '· Empleado';
    const idx = s.indexOf(marker);
    if (idx >= 0) {
        return s.slice(0, idx).trim();
    }
    return s.trim();
}
let PublicBookingService = class PublicBookingService {
    constructor(sqlDb, bookingNotifications) {
        this.sqlDb = sqlDb;
        this.bookingNotifications = bookingNotifications;
    }
    listActivePublicEmployees(users) {
        return users
            .filter((u) => u.status === 'ACTIVE' &&
            (u.role === auth_types_1.UserRole.ADMIN || u.role === auth_types_1.UserRole.EMPLEADO))
            .map((u) => ({
            id: u.id,
            name: displayNameFromEmail(u.email),
            role: u.role,
        }));
    }
    computeOpenSlotsForDate(dateYmd, publicBookingHoursJson) {
        const selected = parseYmd(dateYmd);
        if (!selected) {
            return [];
        }
        const now = new Date();
        const todayStr = ymd(now);
        if (dateYmd < todayStr) {
            return [];
        }
        const weekly = (0, public_booking_hours_util_1.parseWeeklyHoursJson)(publicBookingHoursJson);
        return (0, public_booking_hours_util_1.slotsForPublicBookingDate)(weekly, dateYmd, now);
    }
    dayIntervals(appointments, catalog, dateYmd, excludeId) {
        return appointments
            .filter((a) => a.status !== 'cancelada' &&
            a.when.startsWith(`${dateYmd} `) &&
            (excludeId == null || a.id !== excludeId))
            .map((a) => (0, appointment_scheduling_util_1.appointmentInterval)(a, catalog))
            .filter((x) => x != null);
    }
    assertSlotFitsBusinessHours(dateYmd, timePart, durationMinutes, publicBookingHoursJson) {
        const weekly = (0, public_booking_hours_util_1.parseWeeklyHoursJson)(publicBookingHoursJson);
        const latestClose = (0, public_booking_hours_util_1.latestClosingMinuteForDate)(weekly, dateYmd);
        const startMin = (0, appointment_scheduling_util_1.parseSlotMinutes)(timePart);
        if (startMin == null) {
            throw new common_1.BadRequestException('Horario invalido.');
        }
        if (latestClose != null && startMin + durationMinutes > latestClose) {
            throw new common_1.ForbiddenException('El servicio no cabe antes del cierre de ese dia. Elige otro horario.');
        }
    }
    pickEmployeeForSlot(dateYmd, timePart, durationMinutes, requestedEmployeeId, employees, intervals, latestClose) {
        const employeeIds = employees.map((e) => e.id);
        if (requestedEmployeeId) {
            const available = (0, appointment_scheduling_util_1.isSlotAvailableForEmployee)(dateYmd, timePart, durationMinutes, requestedEmployeeId, employeeIds, intervals, latestClose);
            if (!available) {
                throw new common_1.ConflictException('Ese horario ya fue tomado por ese profesional. Elige otro horario.');
            }
            return requestedEmployeeId;
        }
        const free = employees.find((e) => (0, appointment_scheduling_util_1.isSlotAvailableForEmployee)(dateYmd, timePart, durationMinutes, e.id, employeeIds, intervals, latestClose));
        if (!free) {
            throw new common_1.ConflictException('No quedan profesionales disponibles en ese horario. Elige otro horario.');
        }
        return free.id;
    }
    getSiteConfig() {
        return this.sqlDb.getPlatformSiteConfigForPublic();
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
        const [products, services, branding, users] = await Promise.all([
            this.sqlDb.listProductsByTenantId(tenant.id),
            this.sqlDb.listServicesByTenantId(tenant.id),
            this.sqlDb.getTenantBranding(tenant.id),
            this.sqlDb.listUsersByTenantId(tenant.id),
        ]);
        const employees = this.listActivePublicEmployees(users);
        return {
            products,
            services,
            branding,
            employees,
        };
    }
    async getPublicAvailability(slug, date, durationMinutesRaw) {
        const tenant = await this.sqlDb.findTenantBySlug(slug);
        if (!tenant) {
            throw new common_1.NotFoundException('Negocio no encontrado');
        }
        const normalizedDate = String(date ?? '').trim();
        const selected = parseYmd(normalizedDate);
        if (!selected) {
            throw new common_1.ForbiddenException('Fecha invalida. Usa formato YYYY-MM-DD');
        }
        const durationMinutes = durationMinutesRaw != null && Number.isFinite(durationMinutesRaw)
            ? (0, service_duration_util_1.normalizeServiceDurationMinutes)(durationMinutesRaw)
            : appointment_scheduling_util_1.BOOKING_SLOT_STEP_MINUTES;
        const [users, appointments, branding, services] = await Promise.all([
            this.sqlDb.listUsersByTenantId(tenant.id),
            this.sqlDb.listAppointmentsByTenantId(tenant.id),
            this.sqlDb.getTenantBranding(tenant.id),
            this.sqlDb.listServicesByTenantId(tenant.id),
        ]);
        const employees = this.listActivePublicEmployees(users);
        const openSlots = this.computeOpenSlotsForDate(normalizedDate, branding.publicBookingHoursJson);
        const weekly = (0, public_booking_hours_util_1.parseWeeklyHoursJson)(branding.publicBookingHoursJson);
        const latestClose = (0, public_booking_hours_util_1.latestClosingMinuteForDate)(weekly, normalizedDate);
        const intervals = this.dayIntervals(appointments, services, normalizedDate);
        const employeeIds = employees.map((e) => e.id);
        const slotsByEmployee = {};
        for (const e of employees) {
            slotsByEmployee[e.id] = openSlots.filter((slot) => (0, appointment_scheduling_util_1.isSlotAvailableForEmployee)(normalizedDate, slot, durationMinutes, e.id, employeeIds, intervals, latestClose));
        }
        const allSlots = openSlots.filter((slot) => employees.some((e) => (0, appointment_scheduling_util_1.isSlotAvailableForEmployee)(normalizedDate, slot, durationMinutes, e.id, employeeIds, intervals, latestClose)));
        return {
            date: normalizedDate,
            durationMinutes,
            slotsByEmployee,
            allSlots,
            employees,
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
        const [users, branding, services] = await Promise.all([
            this.sqlDb.listUsersByTenantId(tenant.id),
            this.sqlDb.getTenantBranding(tenant.id),
            this.sqlDb.listServicesByTenantId(tenant.id),
        ]);
        const employees = this.listActivePublicEmployees(users);
        const requestedEmployeeId = dto.employeeId?.trim() || '';
        if (requestedEmployeeId &&
            !employees.some((e) => e.id === requestedEmployeeId)) {
            throw new common_1.ForbiddenException('Empleado invalido o no disponible para este negocio');
        }
        const datePart = dto.when.slice(0, 10);
        const timePart = dto.when.slice(11, 16);
        const durationMinutes = dto.durationMinutes != null && Number.isFinite(Number(dto.durationMinutes))
            ? (0, service_duration_util_1.normalizeTotalBookingDurationMinutes)(Number(dto.durationMinutes))
            : (0, appointment_scheduling_util_1.resolveDurationForServiceLabel)(dto.service, services);
        const openSlots = this.computeOpenSlotsForDate(datePart, branding.publicBookingHoursJson);
        if (!openSlots.includes(timePart)) {
            throw new common_1.ForbiddenException('Horario fuera de disponibilidad para ese dia');
        }
        this.assertSlotFitsBusinessHours(datePart, timePart, durationMinutes, branding.publicBookingHoursJson);
        const appointments = await this.sqlDb.listAppointmentsByTenantId(tenant.id);
        const weekly = (0, public_booking_hours_util_1.parseWeeklyHoursJson)(branding.publicBookingHoursJson);
        const latestClose = (0, public_booking_hours_util_1.latestClosingMinuteForDate)(weekly, datePart);
        const intervals = this.dayIntervals(appointments, services, datePart);
        const employeeId = this.pickEmployeeForSlot(datePart, timePart, durationMinutes, requestedEmployeeId, employees, intervals, latestClose);
        const consent = dto.whatsappReminderConsent === true;
        const phoneDigits = (0, phone_co_util_1.normalizeColombiaMobileDigits)(dto.customerPhone);
        if (!phoneDigits) {
            throw new common_1.BadRequestException('Indica un movil colombiano valido (10 digitos, empieza por 3).');
        }
        if (!consent) {
            throw new common_1.BadRequestException('Debes confirmar que tu numero tiene WhatsApp y autorizar el contacto del negocio.');
        }
        const appointment = await this.sqlDb.createAppointment({
            tenantId: tenant.id,
            customer: dto.customer.trim(),
            service: `${dto.service} · EmpleadoId:${employeeId || 'any'}`,
            when: dto.when,
            status: 'pendiente',
            customerPhoneE164: phoneDigits,
            waReminderConsent: true,
            durationMinutes,
        });
        void this.bookingNotifications
            .onBookingCreated({
            tenantSlug: slug,
            tenantName: tenant.name,
            appointmentId: appointment.id,
            customer: appointment.customer,
            service: dto.service,
            when: appointment.when,
            customerPhoneE164: appointment.customerPhoneE164 ?? null,
        })
            .catch(() => undefined);
        return appointment;
    }
    async reprogramarCita(slug, dto) {
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
        const appt = await this.sqlDb.findAppointmentById(dto.appointmentId.trim());
        if (!appt || appt.tenantId !== tenant.id) {
            throw new common_1.NotFoundException('Cita no encontrada');
        }
        if (!(0, customer_name_match_util_1.publicCustomerNameMatches)(appt.customer, dto.customer)) {
            throw new common_1.ForbiddenException('El nombre no coincide con la reserva.');
        }
        if (appt.status === 'cancelada' || appt.attendance !== 'PENDIENTE') {
            throw new common_1.ForbiddenException('Esta cita no se puede reprogramar desde aqui.');
        }
        const startMs = (0, appointment_scheduling_util_1.appointmentStartMs)(appt.when);
        if (startMs == null) {
            throw new common_1.BadRequestException('La cita no tiene una fecha valida.');
        }
        if (startMs - Date.now() < PUBLIC_RESCHEDULE_MIN_LEAD_MS) {
            throw new common_1.ForbiddenException('Solo puedes cambiar el horario con al menos 90 minutos de antelacion sobre el inicio de la cita.');
        }
        const [users, branding, services] = await Promise.all([
            this.sqlDb.listUsersByTenantId(tenant.id),
            this.sqlDb.getTenantBranding(tenant.id),
            this.sqlDb.listServicesByTenantId(tenant.id),
        ]);
        const employees = this.listActivePublicEmployees(users);
        const rawEmp = (dto.employeeId ?? '').trim();
        const requestedEmployeeId = rawEmp === 'any' ? '' : rawEmp;
        if (requestedEmployeeId &&
            !employees.some((e) => e.id === requestedEmployeeId)) {
            throw new common_1.ForbiddenException('Empleado invalido o no disponible para este negocio');
        }
        const datePart = dto.when.slice(0, 10);
        const timePart = dto.when.slice(11, 16);
        const baseService = publicServiceLabelForLookup(appt.service);
        const durationMinutes = (0, appointment_scheduling_util_1.resolveAppointmentDurationMinutes)(appt, services);
        const openSlots = this.computeOpenSlotsForDate(datePart, branding.publicBookingHoursJson);
        if (!openSlots.includes(timePart)) {
            throw new common_1.ForbiddenException('Horario fuera de disponibilidad para ese dia');
        }
        this.assertSlotFitsBusinessHours(datePart, timePart, durationMinutes, branding.publicBookingHoursJson);
        const appointments = await this.sqlDb.listAppointmentsByTenantId(tenant.id);
        const weekly = (0, public_booking_hours_util_1.parseWeeklyHoursJson)(branding.publicBookingHoursJson);
        const latestClose = (0, public_booking_hours_util_1.latestClosingMinuteForDate)(weekly, datePart);
        const intervals = this.dayIntervals(appointments, services, datePart, appt.id);
        let employeeId = requestedEmployeeId;
        if (!employeeId) {
            const existingEmp = (0, appointment_scheduling_util_1.readEmployeeIdFromServiceText)(appt.service);
            if (existingEmp && existingEmp !== 'any') {
                employeeId = existingEmp;
            }
        }
        employeeId = this.pickEmployeeForSlot(datePart, timePart, durationMinutes, employeeId, employees, intervals, latestClose);
        const newService = `${baseService} · EmpleadoId:${employeeId || 'any'}`;
        const updated = await this.sqlDb.updateAppointmentWhenAndService(tenant.id, appt.id, dto.when.trim(), newService);
        if (!updated) {
            throw new common_1.NotFoundException('No se pudo actualizar la cita.');
        }
        return updated;
    }
    async confirmAttendance(slug, dto) {
        const updated = await this.sqlDb.confirmPublicAppointmentAttendance(slug, dto.appointmentId, dto.customer);
        if (!updated) {
            throw new common_1.NotFoundException('No se pudo registrar la asistencia. Revisa referencia y nombre.');
        }
        return updated;
    }
    async buscarCitasActivas(slug, dto) {
        const ref = dto.appointmentId?.trim() ?? '';
        const phone = dto.customerPhone?.trim() ?? '';
        if (!ref && !phone) {
            throw new common_1.BadRequestException('Indica la referencia de tu cita o el movil que usaste al reservar (con consentimiento de contacto).');
        }
        if (phone && !ref) {
            const digits = (0, phone_co_util_1.normalizeColombiaMobileDigits)(phone);
            if (!digits) {
                throw new common_1.BadRequestException('El telefono no es valido. Usa un movil colombiano de 10 digitos (empieza por 3).');
            }
        }
        const rows = await this.sqlDb.lookupPublicAppointmentsForClient(slug, dto.customer?.trim() || undefined, ref || undefined, phone || undefined);
        return {
            appointments: rows.map((a) => ({
                id: a.id,
                when: a.when,
                serviceLabel: publicServiceLabelForLookup(a.service),
                customer: a.customer,
                employeeId: (0, appointment_scheduling_util_1.readEmployeeIdFromServiceText)(a.service),
                status: a.status,
                attendance: a.attendance,
            })),
        };
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
exports.PublicBookingService = PublicBookingService;
exports.PublicBookingService = PublicBookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService,
        booking_notification_service_1.BookingNotificationService])
], PublicBookingService);
//# sourceMappingURL=public-booking.service.js.map