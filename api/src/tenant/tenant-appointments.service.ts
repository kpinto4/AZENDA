import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser, UserRole } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { AppointmentEntity } from '../infrastructure/sql-db/sql-db.types';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PatchAppointmentAttendanceDto } from './dto/patch-appointment-attendance.dto';
import { PatchAppointmentStatusDto } from './dto/patch-appointment-status.dto';

@Injectable()
export class TenantAppointmentsService {
  constructor(private readonly sqlDb: SqlDbService) {}

  listForUser(user: AuthUser): AppointmentEntity[] {
    this.requireTenantUser(user);
    return this.sqlDb.listAppointmentsByTenantId(user.tenantId!);
  }

  createForUser(user: AuthUser, dto: CreateAppointmentDto): AppointmentEntity {
    this.requireTenantUser(user);
    const tenant = this.sqlDb.findTenantById(user.tenantId!);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    if (!tenant.modules.citas) {
      throw new ForbiddenException('El modulo de citas no esta activo para este tenant');
    }
    if (!tenant.manualBookingEnabled) {
      throw new ForbiddenException(
        'La creacion manual de citas esta desactivada en configuracion del negocio',
      );
    }
    const conflict = this.sqlDb.findAppointmentByTenantAndWhen(user.tenantId!, dto.when);
    if (conflict) {
      throw new ConflictException(
        'Ya existe una cita en ese mismo dia y hora. Elige otro horario.',
      );
    }
    return this.sqlDb.createAppointment({
      tenantId: user.tenantId!,
      customer: dto.customer,
      service: dto.service,
      when: dto.when,
      status: 'pendiente',
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
      'El estado se calcula automaticamente segun la asistencia',
    );
  }

  patchAttendance(
    user: AuthUser,
    appointmentId: string,
    dto: PatchAppointmentAttendanceDto,
  ): AppointmentEntity {
    this.requireTenantUser(user);
    const updated = this.sqlDb.updateAppointmentAttendance(
      appointmentId,
      user.tenantId!,
      dto.attendance,
    );
    if (!updated) {
      throw new NotFoundException('Cita no encontrada');
    }
    return updated;
  }

  private requireTenantUser(user: AuthUser): void {
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Usa el panel tenant con un usuario de negocio');
    }
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin tenant');
    }
  }
}
