import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../auth/auth.types';
import { publicCustomerNameMatches } from '../common/customer-name-match.util';
import { normalizePhoneToWaDigits } from '../common/phone-e164.util';
import { parseWeeklyHoursJson, slotsForPublicBookingDate } from '../common/public-booking-hours.util';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { AppointmentEntity, TenantEntity, UserEntity } from '../infrastructure/sql-db/sql-db.types';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
import { LookupPublicAppointmentsDto } from './dto/lookup-public-appointments.dto';
import { ReschedulePublicAppointmentDto } from './dto/reschedule-public-appointment.dto';

function catalogoPublicoActivo(t: TenantEntity): boolean {
  const planOk = t.plan === 'Pro' || t.plan === 'Negocio';
  return (
    planOk &&
    t.storefrontEnabled &&
    t.modules.inventario &&
    t.modules.ventas &&
    t.status === 'ACTIVE'
  );
}

function displayNameFromEmail(email: string): string {
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

function parseYmd(value: string): Date | null {
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

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readEmployeeIdFromService(value: string): string | null {
  const m = /\bEmpleadoId:([A-Za-z0-9_-]+)\b/.exec(value);
  return m?.[1] ?? null;
}

function publicAppointmentStartMs(when: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(when.trim());
  if (!m) {
    return null;
  }
  const hh = m[2].padStart(2, '0');
  const d = new Date(`${m[1]}T${hh}:${m[3]}:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

const PUBLIC_RESCHEDULE_MIN_LEAD_MS = 90 * 60 * 1000;

function publicServiceLabelForLookup(service: string | null | undefined): string {
  const s = service == null ? '' : String(service);
  const marker = '· Empleado';
  const idx = s.indexOf(marker);
  if (idx >= 0) {
    return s.slice(0, idx).trim();
  }
  return s.trim();
}

function applyUnknownOccupancy(
  employeeIds: string[],
  knownTaken: Set<string>,
  unknownCount: number,
): Set<string> {
  if (unknownCount <= 0 || employeeIds.length === 0) {
    return knownTaken;
  }
  const out = new Set<string>(knownTaken);
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

/**
 * Reglas de negocio de rutas públicas (reserva, catálogo, tienda).
 * El controlador solo delega; la persistencia sigue en {@link SqlDbService} hasta dividir repositorios.
 */
@Injectable()
export class PublicBookingService {
  constructor(private readonly sqlDb: SqlDbService) {}

  private listActivePublicEmployees(users: UserEntity[]) {
    return users
      .filter(
        (u) =>
          u.status === 'ACTIVE' && (u.role === UserRole.ADMIN || u.role === UserRole.EMPLEADO),
      )
      .map((u) => ({
        id: u.id,
        name: displayNameFromEmail(u.email),
        role: u.role,
      }));
  }

  private computeOpenSlotsForDate(dateYmd: string, publicBookingHoursJson: string | null): string[] {
    const selected = parseYmd(dateYmd);
    if (!selected) {
      return [];
    }
    const now = new Date();
    const todayStr = ymd(now);
    if (dateYmd < todayStr) {
      return [];
    }
    const weekly = parseWeeklyHoursJson(publicBookingHoursJson);
    return slotsForPublicBookingDate(weekly, dateYmd, now);
  }

  getSiteConfig() {
    return this.sqlDb.getPlatformSiteConfig();
  }

  async getPublicMeta(slug: string) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
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

  async getPublicCatalog(slug: string) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
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

  async getPublicAvailability(slug: string, date: string) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    const normalizedDate = String(date ?? '').trim();
    const selected = parseYmd(normalizedDate);
    if (!selected) {
      throw new ForbiddenException('Fecha invalida. Usa formato YYYY-MM-DD');
    }
    const [users, appointments, branding] = await Promise.all([
      this.sqlDb.listUsersByTenantId(tenant.id),
      this.sqlDb.listAppointmentsByTenantId(tenant.id),
      this.sqlDb.getTenantBranding(tenant.id),
    ]);
    const employees = this.listActivePublicEmployees(users);
    const openSlots = this.computeOpenSlotsForDate(normalizedDate, branding.publicBookingHoursJson);
    const appointmentsBySlot = new Map<string, AppointmentEntity[]>();
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
    const slotsByEmployee: Record<string, string[]> = {};
    for (const e of employees) {
      slotsByEmployee[e.id] = openSlots.filter((slot) => {
        const rows = appointmentsBySlot.get(slot) ?? [];
        const knownTaken = new Set<string>();
        let unknownCount = 0;
        for (const row of rows) {
          const emp = readEmployeeIdFromService(row.service);
          if (emp) {
            knownTaken.add(emp);
          } else {
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

  async createBooking(slug: string, dto: CreatePublicAppointmentDto) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Este negocio no acepta reservas publicas en este momento');
    }
    if (!tenant.modules.citas) {
      throw new ForbiddenException('Reservas no disponibles para este negocio');
    }
    const [users, branding] = await Promise.all([
      this.sqlDb.listUsersByTenantId(tenant.id),
      this.sqlDb.getTenantBranding(tenant.id),
    ]);
    const employees = this.listActivePublicEmployees(users);
    const requestedEmployeeId = dto.employeeId?.trim() || '';
    if (requestedEmployeeId && !employees.some((e) => e.id === requestedEmployeeId)) {
      throw new ForbiddenException('Empleado invalido o no disponible para este negocio');
    }
    const datePart = dto.when.slice(0, 10);
    const timePart = dto.when.slice(11, 16);
    const openSlots = this.computeOpenSlotsForDate(datePart, branding.publicBookingHoursJson);
    if (!openSlots.includes(timePart)) {
      throw new ForbiddenException('Horario fuera de disponibilidad para ese dia');
    }
    const appointments = await this.sqlDb.listAppointmentsByTenantId(tenant.id);
    const sameMoment = appointments.filter(
      (a) => a.when === dto.when && a.status !== 'cancelada',
    );
    let employeeId = requestedEmployeeId;
    if (requestedEmployeeId) {
      const conflict = sameMoment.some(
        (a) => readEmployeeIdFromService(a.service) === requestedEmployeeId,
      );
      if (conflict) {
        throw new ConflictException(
          'Ese horario ya fue tomado por ese profesional. Elige otro horario.',
        );
      }
    } else {
      const knownOccupied = new Set(
        sameMoment.map((a) => readEmployeeIdFromService(a.service)).filter(Boolean) as string[],
      );
      const unknownCount = sameMoment.filter((a) => !readEmployeeIdFromService(a.service)).length;
      const occupied = applyUnknownOccupancy(
        employees.map((e) => e.id),
        knownOccupied,
        unknownCount,
      );
      const freeEmployee = employees.find((e) => !occupied.has(e.id));
      if (!freeEmployee) {
        throw new ConflictException(
          'No quedan profesionales disponibles en ese horario. Elige otro horario.',
        );
      }
      employeeId = freeEmployee.id;
    }
    const consent = dto.whatsappReminderConsent === true;
    const defaultCc = (process.env.PUBLIC_BOOKING_DEFAULT_COUNTRY_CODE ?? '34').trim() || '34';
    const phoneDigits = normalizePhoneToWaDigits(dto.customerPhone, defaultCc);
    if (consent && !phoneDigits) {
      throw new BadRequestException(
        'Para facilitar el contacto por WhatsApp indica un telefono valido (prefijo internacional o 9 cifras en España).',
      );
    }

    return this.sqlDb.createAppointment({
      tenantId: tenant.id,
      customer: dto.customer.trim(),
      service: `${dto.service} · EmpleadoId:${employeeId || 'any'}`,
      when: dto.when,
      status: 'pendiente',
      customerPhoneE164: consent ? phoneDigits : null,
      waReminderConsent: consent,
    });
  }

  async reprogramarCita(slug: string, dto: ReschedulePublicAppointmentDto) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Este negocio no acepta reservas publicas en este momento');
    }
    if (!tenant.modules.citas) {
      throw new ForbiddenException('Reservas no disponibles para este negocio');
    }
    const appt = await this.sqlDb.findAppointmentById(dto.appointmentId.trim());
    if (!appt || appt.tenantId !== tenant.id) {
      throw new NotFoundException('Cita no encontrada');
    }
    if (!publicCustomerNameMatches(appt.customer, dto.customer)) {
      throw new ForbiddenException('El nombre no coincide con la reserva.');
    }
    if (appt.status === 'cancelada' || appt.attendance !== 'PENDIENTE') {
      throw new ForbiddenException('Esta cita no se puede reprogramar desde aqui.');
    }
    const startMs = publicAppointmentStartMs(appt.when);
    if (startMs == null) {
      throw new BadRequestException('La cita no tiene una fecha valida.');
    }
    if (startMs - Date.now() < PUBLIC_RESCHEDULE_MIN_LEAD_MS) {
      throw new ForbiddenException(
        'Solo puedes cambiar el horario con al menos 90 minutos de antelacion sobre el inicio de la cita.',
      );
    }

    const [users, branding] = await Promise.all([
      this.sqlDb.listUsersByTenantId(tenant.id),
      this.sqlDb.getTenantBranding(tenant.id),
    ]);
    const employees = this.listActivePublicEmployees(users);
    const rawEmp = (dto.employeeId ?? '').trim();
    const requestedEmployeeId = rawEmp === 'any' ? '' : rawEmp;
    if (requestedEmployeeId && !employees.some((e) => e.id === requestedEmployeeId)) {
      throw new ForbiddenException('Empleado invalido o no disponible para este negocio');
    }
    const datePart = dto.when.slice(0, 10);
    const timePart = dto.when.slice(11, 16);
    const openSlots = this.computeOpenSlotsForDate(datePart, branding.publicBookingHoursJson);
    if (!openSlots.includes(timePart)) {
      throw new ForbiddenException('Horario fuera de disponibilidad para ese dia');
    }
    const appointments = await this.sqlDb.listAppointmentsByTenantId(tenant.id);
    const sameMoment = appointments.filter(
      (a) => a.when === dto.when && a.status !== 'cancelada' && a.id !== appt.id,
    );
    const baseService = publicServiceLabelForLookup(appt.service);

    let employeeId = requestedEmployeeId;
    if (requestedEmployeeId) {
      const conflict = sameMoment.some(
        (a) => readEmployeeIdFromService(a.service) === requestedEmployeeId,
      );
      if (conflict) {
        throw new ConflictException(
          'Ese horario ya fue tomado por ese profesional. Elige otro horario.',
        );
      }
    } else {
      const existingEmp = readEmployeeIdFromService(appt.service);
      if (existingEmp && existingEmp !== 'any') {
        employeeId = existingEmp;
        const conflict = sameMoment.some(
          (a) => readEmployeeIdFromService(a.service) === employeeId,
        );
        if (conflict) {
          throw new ConflictException(
            'Ese horario ya fue tomado por ese profesional. Elige otro horario.',
          );
        }
      } else {
        const knownOccupied = new Set(
          sameMoment.map((a) => readEmployeeIdFromService(a.service)).filter(Boolean) as string[],
        );
        const unknownCount = sameMoment.filter((a) => !readEmployeeIdFromService(a.service)).length;
        const occupied = applyUnknownOccupancy(
          employees.map((e) => e.id),
          knownOccupied,
          unknownCount,
        );
        const freeEmployee = employees.find((e) => !occupied.has(e.id));
        if (!freeEmployee) {
          throw new ConflictException(
            'No quedan profesionales disponibles en ese horario. Elige otro horario.',
          );
        }
        employeeId = freeEmployee.id;
      }
    }

    const newService = `${baseService} · EmpleadoId:${employeeId || 'any'}`;
    const updated = await this.sqlDb.updateAppointmentWhenAndService(
      tenant.id,
      appt.id,
      dto.when.trim(),
      newService,
    );
    if (!updated) {
      throw new NotFoundException('No se pudo actualizar la cita.');
    }
    return updated;
  }

  async confirmAttendance(slug: string, dto: ConfirmPublicAttendanceDto) {
    const updated = await this.sqlDb.confirmPublicAppointmentAttendance(
      slug,
      dto.appointmentId,
      dto.customer,
    );
    if (!updated) {
      throw new NotFoundException('No se pudo registrar la asistencia. Revisa referencia y nombre.');
    }
    return updated;
  }

  async buscarCitasActivas(slug: string, dto: LookupPublicAppointmentsDto) {
    const ref = dto.appointmentId?.trim() ?? '';
    const phone = dto.customerPhone?.trim() ?? '';
    if (!ref && !phone) {
      throw new BadRequestException(
        'Indica la referencia de tu cita o el movil que usaste al reservar (con consentimiento de contacto).',
      );
    }
    const defaultCc = (process.env.PUBLIC_BOOKING_DEFAULT_COUNTRY_CODE ?? '34').trim() || '34';
    if (phone && !ref) {
      const digits = normalizePhoneToWaDigits(phone, defaultCc);
      if (!digits) {
        throw new BadRequestException(
          'El telefono no es valido. Incluye prefijo internacional (ej. +57 304…) o el mismo formato que al reservar.',
        );
      }
    }
    const rows = await this.sqlDb.lookupPublicAppointmentsForClient(
      slug,
      dto.customer?.trim() || undefined,
      ref || undefined,
      phone || undefined,
    );
    return {
      appointments: rows.map((a) => ({
        id: a.id,
        when: a.when,
        serviceLabel: publicServiceLabelForLookup(a.service),
        customer: a.customer,
        employeeId: readEmployeeIdFromService(a.service),
        status: a.status,
        attendance: a.attendance,
      })),
    };
  }

  async createStoreVisit(slug: string, dto: CreatePublicStoreVisitDto) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Este enlace no esta disponible en este momento');
    }
    if (!tenant.modules.ventas) {
      throw new ForbiddenException('Registro de tienda no disponible para este negocio');
    }
    return this.sqlDb.createStoreVisitLog({
      tenantId: tenant.id,
      customer: dto.customer,
      detail: dto.detail,
    });
  }
}
