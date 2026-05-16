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
exports.AppointmentRepository = void 0;
const common_1 = require("@nestjs/common");
const customer_name_match_util_1 = require("../../../common/customer-name-match.util");
const phone_e164_util_1 = require("../../../common/phone-e164.util");
const pg_client_service_1 = require("../pg-client.service");
const tenant_repository_1 = require("./tenant.repository");
let AppointmentRepository = class AppointmentRepository {
    constructor(pg, tenants) {
        this.pg = pg;
        this.tenants = tenants;
    }
    mapAppointmentRow(row) {
        const attendanceRaw = row.attendance;
        const attendance = attendanceRaw === 'ASISTIO' ||
            attendanceRaw === 'NO_ASISTIO' ||
            attendanceRaw === 'PENDIENTE'
            ? attendanceRaw
            : 'PENDIENTE';
        const phoneRaw = row.customer_phone_e164;
        const consentRaw = row.wa_reminder_consent;
        const sentRaw = row.wa_reminder_sent_at;
        return {
            id: String(row.id),
            tenantId: String(row.tenant_id),
            customer: String(row.customer),
            service: String(row.service),
            when: String(row.when_at),
            status: row.status,
            attendance,
            customerPhoneE164: phoneRaw == null || String(phoneRaw).trim() === '' ? null : String(phoneRaw).trim(),
            waReminderConsent: Boolean(consentRaw),
            waReminderSentAt: sentRaw == null || String(sentRaw).trim() === '' ? null : String(sentRaw),
        };
    }
    async listByTenantId(tenantId) {
        const rows = await this.pg.queryRows(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE tenant_id = ?
        ORDER BY when_at ASC
      `, [tenantId]);
        return rows.map((row) => this.mapAppointmentRow(row));
    }
    async create(data) {
        const id = `appt_${Date.now()}`;
        const status = data.status ?? 'pendiente';
        const attendance = data.attendance ?? 'PENDIENTE';
        const phone = data.customerPhoneE164?.trim() || null;
        const waConsent = Boolean(data.waReminderConsent);
        await this.pg.exec(`
        INSERT INTO appointments (
          id, tenant_id, customer, service, when_at, status, attendance,
          customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `, [id, data.tenantId, data.customer, data.service, data.when, status, attendance, phone, waConsent]);
        const created = await this.findById(id);
        if (!created) {
            throw new Error('No se pudo leer la cita recien creada');
        }
        return created;
    }
    async markReminderSentForTenant(appointmentId, tenantId) {
        await this.pg.exec(`UPDATE appointments SET wa_reminder_sent_at = ? WHERE id = ? AND tenant_id = ?`, [new Date().toISOString(), appointmentId, tenantId]);
        const row = await this.pg.queryOne(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE id = ? AND tenant_id = ?
        LIMIT 1
      `, [appointmentId, tenantId]);
        return row ? this.mapAppointmentRow(row) : undefined;
    }
    async findByTenantAndWhen(tenantId, when) {
        const row = await this.pg.queryOne(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE tenant_id = ? AND when_at = ?
        LIMIT 1
      `, [tenantId, when]);
        return row ? this.mapAppointmentRow(row) : undefined;
    }
    async findById(appointmentId) {
        const row = await this.pg.queryOne(`
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE id = ?
      `, [appointmentId]);
        return row ? this.mapAppointmentRow(row) : undefined;
    }
    async updateWhenAndService(tenantId, appointmentId, when, service) {
        const current = await this.findById(appointmentId);
        if (!current || current.tenantId !== tenantId) {
            return undefined;
        }
        await this.pg.exec(`UPDATE appointments SET when_at = ?, service = ? WHERE id = ? AND tenant_id = ?`, [when, service, appointmentId, tenantId]);
        return this.findById(appointmentId);
    }
    async updateStatus(appointmentId, tenantId, status) {
        const current = await this.findById(appointmentId);
        if (!current || current.tenantId !== tenantId) {
            return undefined;
        }
        await this.pg.exec(`UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?`, [
            status,
            appointmentId,
            tenantId,
        ]);
        return { ...current, status };
    }
    async updateAttendance(appointmentId, tenantId, attendance) {
        const current = await this.findById(appointmentId);
        if (!current || current.tenantId !== tenantId) {
            return undefined;
        }
        const status = attendance === 'ASISTIO'
            ? 'confirmada'
            : attendance === 'NO_ASISTIO'
                ? 'cancelada'
                : 'pendiente';
        await this.pg.exec(`UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`, [attendance, status, appointmentId, tenantId]);
        return { ...current, attendance, status };
    }
    async confirmPublicAttendance(slug, appointmentId, customerName) {
        const tenant = await this.tenants.findBySlug(slug);
        if (!tenant || tenant.status !== 'ACTIVE' || !tenant.modules.citas) {
            return undefined;
        }
        const appt = await this.findById(appointmentId);
        if (!appt || appt.tenantId !== tenant.id) {
            return undefined;
        }
        if (appt.status === 'cancelada') {
            return undefined;
        }
        if (!(0, customer_name_match_util_1.publicCustomerNameMatches)(appt.customer, customerName)) {
            return undefined;
        }
        await this.pg.exec(`UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`, ['ASISTIO', 'confirmada', appointmentId, tenant.id]);
        return { ...appt, attendance: 'ASISTIO', status: 'confirmada' };
    }
    async lookupPublicForClient(slug, customerNameRaw, appointmentIdRaw, customerPhoneRaw) {
        const tenant = await this.tenants.findBySlug(slug);
        if (!tenant || tenant.status !== 'ACTIVE' || !tenant.modules.citas) {
            return [];
        }
        const customerName = (customerNameRaw ?? '').trim();
        const ref = appointmentIdRaw?.trim() ?? '';
        const defaultCc = (process.env.PUBLIC_BOOKING_DEFAULT_COUNTRY_CODE ?? '34').trim() || '34';
        const phoneDigits = customerPhoneRaw?.trim()
            ? (0, phone_e164_util_1.normalizePhoneToWaDigits)(customerPhoneRaw, defaultCc)
            : null;
        if (!ref && !phoneDigits) {
            return [];
        }
        let candidates = [];
        if (ref) {
            const appt = await this.findById(ref);
            if (appt && appt.tenantId === tenant.id) {
                candidates = [appt];
            }
        }
        else if (phoneDigits) {
            const rows = await this.pg.queryRows(`
          SELECT id, tenant_id, customer, service, when_at, status, attendance,
                 customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
          FROM appointments
          WHERE tenant_id = ? AND customer_phone_e164 = ?
            AND status != 'cancelada'
            AND attendance = 'PENDIENTE'
          ORDER BY when_at DESC
          LIMIT 25
        `, [tenant.id, phoneDigits]);
            candidates = rows.map((row) => this.mapAppointmentRow(row));
        }
        return candidates.filter((a) => {
            if (a.attendance !== 'PENDIENTE' || a.status === 'cancelada') {
                return false;
            }
            if (!customerName) {
                return true;
            }
            return (0, customer_name_match_util_1.publicCustomerNameMatches)(a.customer, customerName);
        });
    }
};
exports.AppointmentRepository = AppointmentRepository;
exports.AppointmentRepository = AppointmentRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService,
        tenant_repository_1.TenantRepository])
], AppointmentRepository);
//# sourceMappingURL=appointment.repository.js.map