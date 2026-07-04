import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser, UserRole } from '../auth/auth.types';
import {
  activeEmployeeIds,
  appendEmployeeToServiceLabel,
  assertSlotWithinBusinessHours,
  dayAppointmentIntervals,
  pickEmployeeForBookingSlot,
  resolveBookingDurationMinutes,
} from '../common/appointment-booking-validation.util';
import {
  latestClosingMinuteForDate,
  parseWeeklyHoursJson,
} from '../common/public-booking-hours.util';
import { readEmployeeIdFromServiceText } from '../common/appointment-scheduling.util';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { AppointmentEntity } from '../infrastructure/sql-db/sql-db.types';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PatchAppointmentAttendanceDto } from './dto/patch-appointment-attendance.dto';
import { PatchAppointmentStatusDto } from './dto/patch-appointment-status.dto';

@Injectable()
export class TenantAppointmentsService {
  constructor(private readonly sqlDb: SqlDbService) {}

  async listForUser(user: AuthUser): Promise<AppointmentEntity[]> {
    this.requireTenantUser(user);
    return this.sqlDb.listAppointmentsByTenantId(user.tenantId!);
  }

  async createForUser(
    user: AuthUser,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentEntity> {
    this.requireTenantUser(user);
    const tenant = await this.sqlDb.findTenantById(user.tenantId!);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    if (!tenant.modules.citas) {
      throw new ForbiddenException(
        'El modulo de citas no esta activo para este tenant',
      );
    }
    if (!tenant.manualBookingEnabled) {
      throw new ForbiddenException(
        'La creacion manual de citas esta desactivada en configuracion del negocio',
      );
    }
    const [services, users, appointments, branding] = await Promise.all([
      this.sqlDb.listServicesByTenantId(user.tenantId!),
      this.sqlDb.listUsersByTenantId(user.tenantId!),
      this.sqlDb.listAppointmentsByTenantId(user.tenantId!),
      this.sqlDb.getTenantBranding(user.tenantId!),
    ]);
    const employeeIds = activeEmployeeIds(users);
    if (!employeeIds.length) {
      throw new ForbiddenException(
        'No hay profesionales activos para asignar la cita',
      );
    }
    const datePart = dto.when.slice(0, 10);
    const timePart = dto.when.slice(11, 16);
    const durationMinutes = resolveBookingDurationMinutes(
      dto.service,
      services,
    );
    try {
      assertSlotWithinBusinessHours(
        datePart,
        timePart,
        durationMinutes,
        branding.publicBookingHoursJson,
      );
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'SLOT_CLOSED') {
        throw new ForbiddenException(
          'Horario fuera de disponibilidad para ese dia',
        );
      }
      if (code === 'SLOT_PAST_CLOSING') {
        throw new ForbiddenException(
          'El servicio no cabe antes del cierre de ese dia. Elige otro horario.',
        );
      }
      throw new BadRequestException('Horario invalido.');
    }
    const weekly = parseWeeklyHoursJson(branding.publicBookingHoursJson);
    const latestClose = latestClosingMinuteForDate(weekly, datePart);
    const intervals = dayAppointmentIntervals(appointments, services, datePart);
    const employeeId =
      dto.employeeId?.trim() ||
      readEmployeeIdFromServiceText(dto.service) ||
      (user.role === UserRole.EMPLEADO ? user.id : '');
    if (employeeId && !employeeIds.includes(employeeId)) {
      throw new ForbiddenException(
        'Empleado invalido o no disponible para este negocio',
      );
    }
    const picked = pickEmployeeForBookingSlot(
      datePart,
      timePart,
      durationMinutes,
      employeeId,
      employeeIds,
      intervals,
      latestClose,
    );
    if (!picked) {
      throw new ConflictException(
        'Ese horario ya esta ocupado para el profesional elegido. Elige otro horario.',
      );
    }
    const service = appendEmployeeToServiceLabel(dto.service, picked);
    return this.sqlDb.createAppointment({
      tenantId: user.tenantId!,
      customer: dto.customer,
      service,
      when: dto.when,
      status: 'pendiente',
      durationMinutes,
    });
  }

  patchStatus(
    user: AuthUser,
    appointmentId: string,
    dto: PatchAppointmentStatusDto,
  ): AppointmentEntity {
    this.requireTenantUser(user);
    void appointmentId;
    void dto;
    throw new ForbiddenException(
      'Usa cancelar cita o actualizar asistencia; el estado se deriva de la asistencia',
    );
  }

  async cancelForUser(
    user: AuthUser,
    appointmentId: string,
  ): Promise<AppointmentEntity> {
    this.requireTenantUser(user);
    const current = await this.sqlDb.findAppointmentById(appointmentId);
    if (!current || current.tenantId !== user.tenantId) {
      throw new NotFoundException('Cita no encontrada');
    }
    if (current.status === 'cancelada') {
      throw new BadRequestException('La cita ya estaba cancelada');
    }
    const updated = await this.sqlDb.updateAppointmentStatus(
      appointmentId,
      user.tenantId!,
      'cancelada',
    );
    if (!updated) {
      throw new NotFoundException('Cita no encontrada');
    }
    return updated;
  }

  async patchAttendance(
    user: AuthUser,
    appointmentId: string,
    dto: PatchAppointmentAttendanceDto,
  ): Promise<AppointmentEntity> {
    this.requireTenantUser(user);
    const updated = await this.sqlDb.updateAppointmentAttendance(
      appointmentId,
      user.tenantId!,
      dto.attendance,
    );
    if (!updated) {
      throw new NotFoundException('Cita no encontrada');
    }
    return updated;
  }

  async markManualReminderSent(
    user: AuthUser,
    appointmentId: string,
  ): Promise<AppointmentEntity> {
    this.requireTenantUser(user);
    const updated = await this.sqlDb.markAppointmentReminderSentForTenant(
      appointmentId,
      user.tenantId!,
    );
    if (!updated) {
      throw new NotFoundException('Cita no encontrada');
    }
    return updated;
  }

  private requireTenantUser(user: AuthUser): void {
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Usa el panel tenant con un usuario de negocio',
      );
    }
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin tenant');
    }
  }
}
