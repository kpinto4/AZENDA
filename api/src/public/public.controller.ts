import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { ConfirmPublicAttendanceDto } from './dto/confirm-public-attendance.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { CreatePublicStoreVisitDto } from './dto/create-public-store-visit.dto';

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

@Controller('public')
export class PublicController {
  constructor(private readonly sqlDb: SqlDbService) {}

  @Get(':slug/meta')
  getPublicMeta(@Param('slug') slug: string) {
    const tenant = this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    const active = tenant.status === 'ACTIVE';
    return {
      slug: tenant.slug,
      name: tenant.name,
      active,
      plan: tenant.plan,
      modules: tenant.modules,
      storefrontEnabled: tenant.storefrontEnabled,
      catalogoActivo: active && catalogoPublicoActivo(tenant),
      branding: this.sqlDb.getTenantBranding(tenant.id),
    };
  }

  @Get(':slug/catalog')
  getPublicCatalog(@Param('slug') slug: string) {
    const tenant = this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    return {
      products: this.sqlDb.listProductsByTenantId(tenant.id),
      services: this.sqlDb.listServicesByTenantId(tenant.id),
      branding: this.sqlDb.getTenantBranding(tenant.id),
    };
  }

  @Post(':slug/appointments')
  @HttpCode(HttpStatus.CREATED)
  createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicAppointmentDto,
  ) {
    const tenant = this.sqlDb.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Negocio no encontrado');
    }
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Este negocio no acepta reservas publicas en este momento');
    }
    if (!tenant.modules.citas) {
      throw new ForbiddenException('Reservas no disponibles para este negocio');
    }
    return this.sqlDb.createAppointment({
      tenantId: tenant.id,
      customer: dto.customer,
      service: dto.service,
      when: dto.when,
      status: 'pendiente',
    });
  }

  @Post(':slug/confirmar-asistencia')
  @HttpCode(HttpStatus.OK)
  confirmAttendance(@Param('slug') slug: string, @Body() dto: ConfirmPublicAttendanceDto) {
    const updated = this.sqlDb.confirmPublicAppointmentAttendance(
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
  createStoreVisit(@Param('slug') slug: string, @Body() dto: CreatePublicStoreVisitDto) {
    const tenant = this.sqlDb.findTenantBySlug(slug);
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
