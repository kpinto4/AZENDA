import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';
import { LookupPublicAppointmentsDto } from './dto/lookup-public-appointments.dto';
import { ReschedulePublicAppointmentDto } from './dto/reschedule-public-appointment.dto';
import { PublicBookingService } from './public-booking.service';

@Throttle({ default: { limit: 60, ttl: 60000 } })
@Controller('public')
export class PublicController {
  constructor(private readonly booking: PublicBookingService) {}

  @Get('site-config')
  getSiteConfig() {
    return this.booking.getSiteConfig();
  }

  @Get(':slug/meta')
  getPublicMeta(@Param('slug') slug: string) {
    return this.booking.getPublicMeta(slug);
  }

  @Get(':slug/catalog')
  getPublicCatalog(@Param('slug') slug: string) {
    return this.booking.getPublicCatalog(slug);
  }

  @Get(':slug/availability')
  getPublicAvailability(
    @Param('slug') slug: string,
    @Query('date') date: string,
  ) {
    return this.booking.getPublicAvailability(slug, date);
  }

  @Post(':slug/appointments')
  @HttpCode(HttpStatus.CREATED)
  createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicAppointmentDto,
  ) {
    return this.booking.createBooking(slug, dto);
  }

  @Post(':slug/reprogramar-cita')
  @HttpCode(HttpStatus.OK)
  reprogramarCita(
    @Param('slug') slug: string,
    @Body() dto: ReschedulePublicAppointmentDto,
  ) {
    return this.booking.reprogramarCita(slug, dto);
  }

  @Post(':slug/confirmar-asistencia')
  @HttpCode(HttpStatus.OK)
  confirmAttendance(
    @Param('slug') slug: string,
    @Body() dto: ConfirmPublicAttendanceDto,
  ) {
    return this.booking.confirmAttendance(slug, dto);
  }

  @Post(':slug/buscar-citas')
  @HttpCode(HttpStatus.OK)
  buscarCitasActivas(
    @Param('slug') slug: string,
    @Body() dto: LookupPublicAppointmentsDto,
  ) {
    return this.booking.buscarCitasActivas(slug, dto);
  }

  @Post(':slug/registro-tienda')
  @HttpCode(HttpStatus.CREATED)
  createStoreVisit(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicStoreVisitDto,
  ) {
    return this.booking.createStoreVisit(slug, dto);
  }
}
