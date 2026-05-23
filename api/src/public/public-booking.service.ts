import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../auth/auth.types';
import {
  appointmentInterval,
  appointmentStartMs,
  BOOKING_SLOT_STEP_MINUTES,
  isSlotAvailableForEmployee,
  parseSlotMinutes,
  readEmployeeIdFromServiceText,
  resolveDurationForServiceLabel,
  resolveAppointmentDurationMinutes,
  type ScheduledInterval,
} from '../common/appointment-scheduling.util';
import { publicCustomerNameMatches } from '../common/customer-name-match.util';
import { normalizeColombiaMobileDigits } from '../common/phone-co.util';
import {
  latestClosingMinuteForDate,
  parseWeeklyHoursJson,
  slotsForPublicBookingDate,
} from '../common/public-booking-hours.util';
import { normalizeServiceDurationMinutes, normalizeTotalBookingDurationMinutes } from '../common/service-duration.util';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import {
  AppointmentEntity,
  TenantEntity,
  TenantServiceEntity,
  UserEntity,
} from '../infrastructure/sql-db/sql-db.types';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
import { LookupPublicAppointmentsDto } from './dto/lookup-public-appointments.dto';
import { ReschedulePublicAppointmentDto } from './dto/reschedule-public-appointment.dto';
import { BookingNotificationService } from './booking-notification.service';

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
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
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

const PUBLIC_RESCHEDULE_MIN_LEAD_MS = 90 * 60 * 1000;

function publicServiceLabelForLookup(
  service: string | null | undefined,
): string {
  const s = service == null ? '' : String(service);
  const marker = '· Empleado';
  const idx = s.indexOf(marker);
  if (idx >= 0) {
    return s.slice(0, idx).trim();
  }
  return s.trim();
}

/**
 * Reglas de negocio de rutas públicas (reserva, catálogo, tienda).
 * El controlador solo delega; la persistencia sigue en {@link SqlDbService} hasta dividir repositorios.
 */
@Injectable()
export class PublicBookingService {
  constructor(
    private readonly sqlDb: SqlDbService,
    private readonly bookingNotifications: BookingNotificationService,
  ) {}

  private listActivePublicEmployees(users: UserEntity[]) {
    return users
      .filter(
        (u) =>
          u.status === 'ACTIVE' &&
          (u.role === UserRole.ADMIN || u.role === UserRole.EMPLEADO),
      )
      .map((u) => ({
        id: u.id,
        name: displayNameFromEmail(u.email),
        role: u.role,
      }));
  }

  private computeOpenSlotsForDate(
    dateYmd: string,
    publicBookingHoursJson: string | null,
  ): string[] {
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

  private dayIntervals(
    appointments: AppointmentEntity[],
    catalog: TenantServiceEntity[],
    dateYmd: string,
    excludeId?: string,
  ): ScheduledInterval[] {
    return appointments
      .filter(
        (a) =>
          a.status !== 'cancelada' &&
          a.when.startsWith(`${dateYmd} `) &&
          (excludeId == null || a.id !== excludeId),
      )
      .map((a) => appointmentInterval(a, catalog))
      .filter((x): x is ScheduledInterval => x != null);
  }

  private assertSlotFitsBusinessHours(
    dateYmd: string,
    timePart: string,
    durationMinutes: number,
    publicBookingHoursJson: string | null,
  ): void {
    const weekly = parseWeeklyHoursJson(publicBookingHoursJson);
    const latestClose = latestClosingMinuteForDate(weekly, dateYmd);
    const startMin = parseSlotMinutes(timePart);
    if (startMin == null) {
      throw new BadRequestException('Horario invalido.');
    }
    if (latestClose != null && startMin + durationMinutes > latestClose) {
      throw new ForbiddenException(
        'El servicio no cabe antes del cierre de ese dia. Elige otro horario.',
      );
    }
  }

  private pickEmployeeForSlot(
    dateYmd: string,
    timePart: string,
    durationMinutes: number,
    requestedEmployeeId: string,
    employees: Array<{ id: string }>,
    intervals: ScheduledInterval[],
    latestClose: number | null,
  ): string {
    const employeeIds = employees.map((e) => e.id);
    if (requestedEmployeeId) {
      const available = isSlotAvailableForEmployee(
        dateYmd,
        timePart,
        durationMinutes,
        requestedEmployeeId,
        employeeIds,
        intervals,
        latestClose,
      );
      if (!available) {
        throw new ConflictException(
          'Ese horario ya fue tomado por ese profesional. Elige otro horario.',
        );
      }
      return requestedEmployeeId;
    }
    const free = employees.find((e) =>
      isSlotAvailableForEmployee(
        dateYmd,
        timePart,
        durationMinutes,
        e.id,
        employeeIds,
        intervals,
        latestClose,
      ),
    );
    if (!free) {
      throw new ConflictException(
        'No quedan profesionales disponibles en ese horario. Elige otro horario.',
      );
    }
    return free.id;
  }

  getSiteConfig() {
    return this.sqlDb.getPlatformSiteConfigForPublic();
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

  async getPublicAvailability(
    slug: string,
    date: string,
    durationMinutesRaw?: number,
  ) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    const normalizedDate = String(date ?? '').trim();
    const selected = parseYmd(normalizedDate);
    if (!selected) {
      throw new ForbiddenException('Fecha invalida. Usa formato YYYY-MM-DD');
    }
    const durationMinutes =
      durationMinutesRaw != null && Number.isFinite(durationMinutesRaw)
        ? normalizeServiceDurationMinutes(durationMinutesRaw)
        : BOOKING_SLOT_STEP_MINUTES;
    const [users, appointments, branding, services] = await Promise.all([
      this.sqlDb.listUsersByTenantId(tenant.id),
      this.sqlDb.listAppointmentsByTenantId(tenant.id),
      this.sqlDb.getTenantBranding(tenant.id),
      this.sqlDb.listServicesByTenantId(tenant.id),
    ]);
    const employees = this.listActivePublicEmployees(users);
    const openSlots = this.computeOpenSlotsForDate(
      normalizedDate,
      branding.publicBookingHoursJson,
    );
    const weekly = parseWeeklyHoursJson(branding.publicBookingHoursJson);
    const latestClose = latestClosingMinuteForDate(weekly, normalizedDate);
    const intervals = this.dayIntervals(appointments, services, normalizedDate);
    const employeeIds = employees.map((e) => e.id);
    const slotsByEmployee: Record<string, string[]> = {};
    for (const e of employees) {
      slotsByEmployee[e.id] = openSlots.filter((slot) =>
        isSlotAvailableForEmployee(
          normalizedDate,
          slot,
          durationMinutes,
          e.id,
          employeeIds,
          intervals,
          latestClose,
        ),
      );
    }
    const allSlots = openSlots.filter((slot) =>
      employees.some((e) =>
        isSlotAvailableForEmployee(
          normalizedDate,
          slot,
          durationMinutes,
          e.id,
          employeeIds,
          intervals,
          latestClose,
        ),
      ),
    );
    return {
      date: normalizedDate,
      durationMinutes,
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
      throw new ForbiddenException(
        'Este negocio no acepta reservas publicas en este momento',
      );
    }
    if (!tenant.modules.citas) {
      throw new ForbiddenException('Reservas no disponibles para este negocio');
    }
    const [users, branding, services] = await Promise.all([
      this.sqlDb.listUsersByTenantId(tenant.id),
      this.sqlDb.getTenantBranding(tenant.id),
      this.sqlDb.listServicesByTenantId(tenant.id),
    ]);
    const employees = this.listActivePublicEmployees(users);
    const requestedEmployeeId = dto.employeeId?.trim() || '';
    if (
      requestedEmployeeId &&
      !employees.some((e) => e.id === requestedEmployeeId)
    ) {
      throw new ForbiddenException(
        'Empleado invalido o no disponible para este negocio',
      );
    }
    const datePart = dto.when.slice(0, 10);
    const timePart = dto.when.slice(11, 16);
    const durationMinutes =
      dto.durationMinutes != null && Number.isFinite(Number(dto.durationMinutes))
        ? normalizeTotalBookingDurationMinutes(Number(dto.durationMinutes))
        : resolveDurationForServiceLabel(dto.service, services);
    const openSlots = this.computeOpenSlotsForDate(
      datePart,
      branding.publicBookingHoursJson,
    );
    if (!openSlots.includes(timePart)) {
      throw new ForbiddenException(
        'Horario fuera de disponibilidad para ese dia',
      );
    }
    this.assertSlotFitsBusinessHours(
      datePart,
      timePart,
      durationMinutes,
      branding.publicBookingHoursJson,
    );
    const appointments = await this.sqlDb.listAppointmentsByTenantId(tenant.id);
    const weekly = parseWeeklyHoursJson(branding.publicBookingHoursJson);
    const latestClose = latestClosingMinuteForDate(weekly, datePart);
    const intervals = this.dayIntervals(appointments, services, datePart);
    const employeeId = this.pickEmployeeForSlot(
      datePart,
      timePart,
      durationMinutes,
      requestedEmployeeId,
      employees,
      intervals,
      latestClose,
    );
    const consent = dto.whatsappReminderConsent === true;
    const phoneDigits = normalizeColombiaMobileDigits(dto.customerPhone);
    if (!phoneDigits) {
      throw new BadRequestException(
        'Indica un movil colombiano valido (10 digitos, empieza por 3).',
      );
    }
    if (!consent) {
      throw new BadRequestException(
        'Debes confirmar que tu numero tiene WhatsApp y autorizar el contacto del negocio.',
      );
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

  async reprogramarCita(slug: string, dto: ReschedulePublicAppointmentDto) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Este negocio no acepta reservas publicas en este momento',
      );
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
      throw new ForbiddenException(
        'Esta cita no se puede reprogramar desde aqui.',
      );
    }
    const startMs = appointmentStartMs(appt.when);
    if (startMs == null) {
      throw new BadRequestException('La cita no tiene una fecha valida.');
    }
    if (startMs - Date.now() < PUBLIC_RESCHEDULE_MIN_LEAD_MS) {
      throw new ForbiddenException(
        'Solo puedes cambiar el horario con al menos 90 minutos de antelacion sobre el inicio de la cita.',
      );
    }

    const [users, branding, services] = await Promise.all([
      this.sqlDb.listUsersByTenantId(tenant.id),
      this.sqlDb.getTenantBranding(tenant.id),
      this.sqlDb.listServicesByTenantId(tenant.id),
    ]);
    const employees = this.listActivePublicEmployees(users);
    const rawEmp = (dto.employeeId ?? '').trim();
    const requestedEmployeeId = rawEmp === 'any' ? '' : rawEmp;
    if (
      requestedEmployeeId &&
      !employees.some((e) => e.id === requestedEmployeeId)
    ) {
      throw new ForbiddenException(
        'Empleado invalido o no disponible para este negocio',
      );
    }
    const datePart = dto.when.slice(0, 10);
    const timePart = dto.when.slice(11, 16);
    const baseService = publicServiceLabelForLookup(appt.service);
    const durationMinutes = resolveAppointmentDurationMinutes(appt, services);
    const openSlots = this.computeOpenSlotsForDate(
      datePart,
      branding.publicBookingHoursJson,
    );
    if (!openSlots.includes(timePart)) {
      throw new ForbiddenException(
        'Horario fuera de disponibilidad para ese dia',
      );
    }
    this.assertSlotFitsBusinessHours(
      datePart,
      timePart,
      durationMinutes,
      branding.publicBookingHoursJson,
    );
    const appointments = await this.sqlDb.listAppointmentsByTenantId(tenant.id);
    const weekly = parseWeeklyHoursJson(branding.publicBookingHoursJson);
    const latestClose = latestClosingMinuteForDate(weekly, datePart);
    const intervals = this.dayIntervals(
      appointments,
      services,
      datePart,
      appt.id,
    );

    let employeeId = requestedEmployeeId;
    if (!employeeId) {
      const existingEmp = readEmployeeIdFromServiceText(appt.service);
      if (existingEmp && existingEmp !== 'any') {
        employeeId = existingEmp;
      }
    }
    employeeId = this.pickEmployeeForSlot(
      datePart,
      timePart,
      durationMinutes,
      employeeId,
      employees,
      intervals,
      latestClose,
    );

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
      throw new NotFoundException(
        'No se pudo registrar la asistencia. Revisa referencia y nombre.',
      );
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
    if (phone && !ref) {
      const digits = normalizeColombiaMobileDigits(phone);
      if (!digits) {
        throw new BadRequestException(
          'El telefono no es valido. Usa un movil colombiano de 10 digitos (empieza por 3).',
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
        employeeId: readEmployeeIdFromServiceText(a.service),
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
      throw new ForbiddenException(
        'Este enlace no esta disponible en este momento',
      );
    }
    if (!tenant.modules.ventas) {
      throw new ForbiddenException(
        'Registro de tienda no disponible para este negocio',
      );
    }
    return this.sqlDb.createStoreVisitLog({
      tenantId: tenant.id,
      customer: dto.customer,
      detail: dto.detail,
    });
  }
}
