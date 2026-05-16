import { Injectable } from '@nestjs/common';
import { publicCustomerNameMatches } from '../../../common/customer-name-match.util';
import { normalizePhoneToWaDigits } from '../../../common/phone-e164.util';
import { PgClientService } from '../pg-client.service';
import {
  AppointmentAttendance,
  AppointmentEntity,
  AppointmentStatus,
} from '../sql-db.types';
import { TenantRepository } from './tenant.repository';

@Injectable()
export class AppointmentRepository {
  constructor(
    private readonly pg: PgClientService,
    private readonly tenants: TenantRepository,
  ) {}

  private mapAppointmentRow(row: Record<string, unknown>): AppointmentEntity {
    const attendanceRaw = row.attendance;
    const attendance =
      attendanceRaw === 'ASISTIO' ||
      attendanceRaw === 'NO_ASISTIO' ||
      attendanceRaw === 'PENDIENTE'
        ? (attendanceRaw as AppointmentAttendance)
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
      status: row.status as AppointmentStatus,
      attendance,
      customerPhoneE164: phoneRaw == null || String(phoneRaw).trim() === '' ? null : String(phoneRaw).trim(),
      waReminderConsent: Boolean(consentRaw),
      waReminderSentAt: sentRaw == null || String(sentRaw).trim() === '' ? null : String(sentRaw),
    };
  }

  async listByTenantId(tenantId: string): Promise<AppointmentEntity[]> {
    const rows = await this.pg.queryRows(
      `
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE tenant_id = ?
        ORDER BY when_at ASC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapAppointmentRow(row as Record<string, unknown>));
  }

  async create(data: {
    tenantId: string;
    customer: string;
    service: string;
    when: string;
    status?: AppointmentStatus;
    attendance?: AppointmentAttendance;
    customerPhoneE164?: string | null;
    waReminderConsent?: boolean;
  }): Promise<AppointmentEntity> {
    const id = `appt_${Date.now()}`;
    const status = data.status ?? 'pendiente';
    const attendance = data.attendance ?? 'PENDIENTE';
    const phone = data.customerPhoneE164?.trim() || null;
    const waConsent = Boolean(data.waReminderConsent);
    await this.pg.exec(
      `
        INSERT INTO appointments (
          id, tenant_id, customer, service, when_at, status, attendance,
          customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      [id, data.tenantId, data.customer, data.service, data.when, status, attendance, phone, waConsent],
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('No se pudo leer la cita recien creada');
    }
    return created;
  }

  async markReminderSentForTenant(
    appointmentId: string,
    tenantId: string,
  ): Promise<AppointmentEntity | undefined> {
    await this.pg.exec(
      `UPDATE appointments SET wa_reminder_sent_at = ? WHERE id = ? AND tenant_id = ?`,
      [new Date().toISOString(), appointmentId, tenantId],
    );
    const row = await this.pg.queryOne(
      `
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE id = ? AND tenant_id = ?
        LIMIT 1
      `,
      [appointmentId, tenantId],
    );
    return row ? this.mapAppointmentRow(row as Record<string, unknown>) : undefined;
  }

  async findByTenantAndWhen(tenantId: string, when: string): Promise<AppointmentEntity | undefined> {
    const row = await this.pg.queryOne(
      `
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE tenant_id = ? AND when_at = ?
        LIMIT 1
      `,
      [tenantId, when],
    );
    return row ? this.mapAppointmentRow(row as Record<string, unknown>) : undefined;
  }

  async findById(appointmentId: string): Promise<AppointmentEntity | undefined> {
    const row = await this.pg.queryOne(
      `
        SELECT id, tenant_id, customer, service, when_at, status, attendance,
               customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
        FROM appointments
        WHERE id = ?
      `,
      [appointmentId],
    );
    return row ? this.mapAppointmentRow(row as Record<string, unknown>) : undefined;
  }

  async updateWhenAndService(
    tenantId: string,
    appointmentId: string,
    when: string,
    service: string,
  ): Promise<AppointmentEntity | undefined> {
    const current = await this.findById(appointmentId);
    if (!current || current.tenantId !== tenantId) {
      return undefined;
    }
    await this.pg.exec(
      `UPDATE appointments SET when_at = ?, service = ? WHERE id = ? AND tenant_id = ?`,
      [when, service, appointmentId, tenantId],
    );
    return this.findById(appointmentId);
  }

  async updateStatus(
    appointmentId: string,
    tenantId: string,
    status: AppointmentStatus,
  ): Promise<AppointmentEntity | undefined> {
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

  async updateAttendance(
    appointmentId: string,
    tenantId: string,
    attendance: AppointmentAttendance,
  ): Promise<AppointmentEntity | undefined> {
    const current = await this.findById(appointmentId);
    if (!current || current.tenantId !== tenantId) {
      return undefined;
    }
    const status: AppointmentStatus =
      attendance === 'ASISTIO'
        ? 'confirmada'
        : attendance === 'NO_ASISTIO'
          ? 'cancelada'
          : 'pendiente';
    await this.pg.exec(
      `UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`,
      [attendance, status, appointmentId, tenantId],
    );
    return { ...current, attendance, status };
  }

  async confirmPublicAttendance(
    slug: string,
    appointmentId: string,
    customerName: string,
  ): Promise<AppointmentEntity | undefined> {
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
    if (!publicCustomerNameMatches(appt.customer, customerName)) {
      return undefined;
    }
    await this.pg.exec(
      `UPDATE appointments SET attendance = ?, status = ? WHERE id = ? AND tenant_id = ?`,
      ['ASISTIO', 'confirmada', appointmentId, tenant.id],
    );
    return { ...appt, attendance: 'ASISTIO', status: 'confirmada' };
  }

  async lookupPublicForClient(
    slug: string,
    customerNameRaw: string | undefined | null,
    appointmentIdRaw?: string | null,
    customerPhoneRaw?: string | null,
  ): Promise<AppointmentEntity[]> {
    const tenant = await this.tenants.findBySlug(slug);
    if (!tenant || tenant.status !== 'ACTIVE' || !tenant.modules.citas) {
      return [];
    }
    const customerName = (customerNameRaw ?? '').trim();
    const ref = appointmentIdRaw?.trim() ?? '';
    const defaultCc = (process.env.PUBLIC_BOOKING_DEFAULT_COUNTRY_CODE ?? '34').trim() || '34';
    const phoneDigits = customerPhoneRaw?.trim()
      ? normalizePhoneToWaDigits(customerPhoneRaw, defaultCc)
      : null;

    if (!ref && !phoneDigits) {
      return [];
    }

    let candidates: AppointmentEntity[] = [];
    if (ref) {
      const appt = await this.findById(ref);
      if (appt && appt.tenantId === tenant.id) {
        candidates = [appt];
      }
    } else if (phoneDigits) {
      const rows = await this.pg.queryRows(
        `
          SELECT id, tenant_id, customer, service, when_at, status, attendance,
                 customer_phone_e164, wa_reminder_consent, wa_reminder_sent_at
          FROM appointments
          WHERE tenant_id = ? AND customer_phone_e164 = ?
            AND status != 'cancelada'
            AND attendance = 'PENDIENTE'
          ORDER BY when_at DESC
          LIMIT 25
        `,
        [tenant.id, phoneDigits],
      );
      candidates = rows.map((row) => this.mapAppointmentRow(row as Record<string, unknown>));
    }

    return candidates.filter((a) => {
      if (a.attendance !== 'PENDIENTE' || a.status === 'cancelada') {
        return false;
      }
      if (!customerName) {
        return true;
      }
      return publicCustomerNameMatches(a.customer, customerName);
    });
  }
}
