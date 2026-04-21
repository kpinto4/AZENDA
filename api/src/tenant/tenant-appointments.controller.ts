import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser, AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { PatchAppointmentAttendanceDto } from './dto/patch-appointment-attendance.dto';
import { PatchAppointmentStatusDto } from './dto/patch-appointment-status.dto';
import { TenantAppointmentsService } from './tenant-appointments.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('tenant/appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLEADO)
@Systems(AppSystem.TENANT)
export class TenantAppointmentsController {
  constructor(private readonly appointments: TenantAppointmentsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.appointments.listForUser(req.user);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointments.createForUser(req.user, dto);
  }

  @Patch(':appointmentId/status')
  patchStatus(
    @Req() req: AuthenticatedRequest,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: PatchAppointmentStatusDto,
  ) {
    return this.appointments.patchStatus(req.user, appointmentId, dto);
  }

  @Patch(':appointmentId/attendance')
  patchAttendance(
    @Req() req: AuthenticatedRequest,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: PatchAppointmentAttendanceDto,
  ) {
    return this.appointments.patchAttendance(req.user, appointmentId, dto);
  }
}
