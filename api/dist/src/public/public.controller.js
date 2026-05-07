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
const auth_types_1 = require("../auth/auth.types");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
const confirm_public_attendance_dto_1 = require("./dto/confirm-public-attendance.dto");
const create_public_appointment_dto_1 = require("./dto/create-public-appointment.dto");
const create_public_store_visit_dto_1 = require("./dto/create-public-store-visit.dto");
const PUBLIC_BASE_SLOTS = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '18:30',
    '19:00',
    '19:30',
];
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
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
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
function readEmployeeIdFromService(value) {
    const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(value);
    return m?.[1] ?? null;
}
function applyUnknownOccupancy(employeeIds, knownTaken, unknownCount) {
    if (unknownCount <= 0 || employeeIds.length === 0) {
        return knownTaken;
    }
    const out = new Set(knownTaken);
    let pending = unknownCount;
    for (const id of employeeIds) {
        if (pending <= 0) {
            break;
        }
        if (out.has(id)) {
            continue;
        }
        out.add(id);
        pending -= 1;
    }
    return out;
}
let PublicController = class PublicController {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }
    listActivePublicEmployees(users) {
        return users
            .filter((u) => u.status === 'ACTIVE' && (u.role === auth_types_1.UserRole.ADMIN || u.role === auth_types_1.UserRole.EMPLEADO))
            .map((u) => ({
            id: u.id,
            name: displayNameFromEmail(u.email),
            role: u.role,
        }));
    }
    computeOpenSlotsForDate(dateYmd) {
        const selected = parseYmd(dateYmd);
        if (!selected) {
            return [];
        }
        const now = new Date();
        const todayStr = ymd(now);
        if (dateYmd < todayStr) {
            return [];
        }
        if (dateYmd > todayStr) {
            return [...PUBLIC_BASE_SLOTS];
        }
        const hh = now.getHours();
        const mm = now.getMinutes();
        return PUBLIC_BASE_SLOTS.filter((slot) => {
            const [hRaw, mRaw] = slot.split(':');
            const h = Number(hRaw);
            const m = Number(mRaw);
            return h > hh || (h === hh && m > mm);
        });
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
    async getPublicAvailability(slug, date) {
        const tenant = await this.sqlDb.findTenantBySlug(slug);
        if (!tenant) {
            throw new common_1.NotFoundException('Negocio no encontrado');
        }
        const normalizedDate = String(date ?? '').trim();
        const selected = parseYmd(normalizedDate);
        if (!selected) {
            throw new common_1.ForbiddenException('Fecha invalida. Usa formato YYYY-MM-DD');
        }
        const [users, appointments] = await Promise.all([
            this.sqlDb.listUsersByTenantId(tenant.id),
            this.sqlDb.listAppointmentsByTenantId(tenant.id),
        ]);
        const employees = this.listActivePublicEmployees(users);
        const openSlots = this.computeOpenSlotsForDate(normalizedDate);
        const appointmentsBySlot = new Map();
        for (const appt of appointments) {
            if (!appt.when.startsWith(`${normalizedDate} `) || appt.status === 'cancelada') {
                continue;
            }
            const slot = appt.when.slice(11, 16);
            const list = appointmentsBySlot.get(slot) ?? [];
            list.push(appt);
            appointmentsBySlot.set(slot, list);
        }
        const employeeIds = employees.map((e) => e.id);
        const slotsByEmployee = {};
        for (const e of employees) {
            slotsByEmployee[e.id] = openSlots.filter((slot) => {
                const rows = appointmentsBySlot.get(slot) ?? [];
                const knownTaken = new Set();
                let unknownCount = 0;
                for (const row of rows) {
                    const emp = readEmployeeIdFromService(row.service);
                    if (emp) {
                        knownTaken.add(emp);
                    }
                    else {
                        unknownCount += 1;
                    }
                }
                const effectiveTaken = applyUnknownOccupancy(employeeIds, knownTaken, unknownCount);
                return !effectiveTaken.has(e.id);
            });
        }
        const allSlots = openSlots.filter((slot) => {
            const rows = appointmentsBySlot.get(slot) ?? [];
            return rows.length < Math.max(1, employees.length);
        });
        return {
            date: normalizedDate,
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
        const users = await this.sqlDb.listUsersByTenantId(tenant.id);
        const employees = this.listActivePublicEmployees(users);
        const requestedEmployeeId = dto.employeeId?.trim() || '';
        if (requestedEmployeeId && !employees.some((e) => e.id === requestedEmployeeId)) {
            throw new common_1.ForbiddenException('Empleado invalido o no disponible para este negocio');
        }
        const datePart = dto.when.slice(0, 10);
        const timePart = dto.when.slice(11, 16);
        const openSlots = this.computeOpenSlotsForDate(datePart);
        if (!openSlots.includes(timePart)) {
            throw new common_1.ForbiddenException('Horario fuera de disponibilidad para ese dia');
        }
        const appointments = await this.sqlDb.listAppointmentsByTenantId(tenant.id);
        const sameMoment = appointments.filter((a) => a.when === dto.when && a.status !== 'cancelada');
        let employeeId = requestedEmployeeId;
        if (requestedEmployeeId) {
            const conflict = sameMoment.some((a) => readEmployeeIdFromService(a.service) === requestedEmployeeId);
            if (conflict) {
                throw new common_1.ConflictException('Ese horario ya fue tomado por ese profesional. Elige otro horario.');
            }
        }
        else {
            const knownOccupied = new Set(sameMoment.map((a) => readEmployeeIdFromService(a.service)).filter(Boolean));
            const unknownCount = sameMoment.filter((a) => !readEmployeeIdFromService(a.service)).length;
            const occupied = applyUnknownOccupancy(employees.map((e) => e.id), knownOccupied, unknownCount);
            const freeEmployee = employees.find((e) => !occupied.has(e.id));
            if (!freeEmployee) {
                throw new common_1.ConflictException('No quedan profesionales disponibles en ese horario. Elige otro horario.');
            }
            employeeId = freeEmployee.id;
        }
        return this.sqlDb.createAppointment({
            tenantId: tenant.id,
            customer: dto.customer,
            service: `${dto.service} · EmpleadoId:${employeeId || 'any'}`,
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
    (0, common_1.Get)(':slug/availability'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getPublicAvailability", null);
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