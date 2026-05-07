import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { AppointmentEntity, TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';

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

@Controller('public')
export class PublicController {
  constructor(private readonly sqlDb: SqlDbService) {}

  private listActivePublicEmployees(users: Awaited<ReturnType<SqlDbService['listUsersByTenantId']>>) {
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

  private computeOpenSlotsForDate(dateYmd: string): string[] {
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

  /** Debe ir antes de `:slug/*` para que `site-config` no se interprete como slug. */
  @Get('site-config')
  getSiteConfig() {
    return this.sqlDb.getPlatformSiteConfig();
  }

  @Get(':slug/meta')
  async getPublicMeta(@Param('slug') slug: string) {
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

  @Get(':slug/catalog')
  async getPublicCatalog(@Param('slug') slug: string) {
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

  @Get(':slug/availability')
  async getPublicAvailability(@Param('slug') slug: string, @Query('date') date: string) {
    const tenant = await this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    const normalizedDate = String(date ?? '').trim();
    const selected = parseYmd(normalizedDate);
    if (!selected) {
      throw new ForbiddenException('Fecha invalida. Usa formato YYYY-MM-DD');
    }
    const [users, appointments] = await Promise.all([
      this.sqlDb.listUsersByTenantId(tenant.id),
      this.sqlDb.listAppointmentsByTenantId(tenant.id),
    ]);
    const employees = this.listActivePublicEmployees(users);
    const openSlots = this.computeOpenSlotsForDate(normalizedDate);
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

  @Post(':slug/appointments')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicAppointmentDto,
  ) {
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
    const users = await this.sqlDb.listUsersByTenantId(tenant.id);
    const employees = this.listActivePublicEmployees(users);
    const requestedEmployeeId = dto.employeeId?.trim() || '';
    if (requestedEmployeeId && !employees.some((e) => e.id === requestedEmployeeId)) {
      throw new ForbiddenException('Empleado invalido o no disponible para este negocio');
    }
    const datePart = dto.when.slice(0, 10);
    const timePart = dto.when.slice(11, 16);
    const openSlots = this.computeOpenSlotsForDate(datePart);
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
    return this.sqlDb.createAppointment({
      tenantId: tenant.id,
      customer: dto.customer,
      service: `${dto.service} · EmpleadoId:${employeeId || 'any'}`,
      when: dto.when,
      status: 'pendiente',
    });
  }

  @Post(':slug/confirmar-asistencia')
  @HttpCode(HttpStatus.OK)
  async confirmAttendance(@Param('slug') slug: string, @Body() dto: ConfirmPublicAttendanceDto) {
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

  @Post(':slug/registro-tienda')
  @HttpCode(HttpStatus.CREATED)
  async createStoreVisit(@Param('slug') slug: string, @Body() dto: CreatePublicStoreVisitDto) {
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
