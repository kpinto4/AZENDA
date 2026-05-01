import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminTenantsController {
  constructor(private readonly sqlDbService: SqlDbService) {}

  @Get()
  listTenants() {
    return this.sqlDbService.listTenants();
  }

  @Get(':tenantId')
  async getTenantById(@Param('tenantId') tenantId: string) {
    const tenant = await this.sqlDbService.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return tenant;
  }

  @Post()
  createTenant(@Body() body: CreateTenantDto) {
    return this.sqlDbService.createTenant({
      id: body.id,
      name: body.name,
      slug: body.slug,
      status: body.status,
      plan: body.plan ?? 'Trial',
      storefrontEnabled: body.storefrontEnabled ?? false,
      manualBookingEnabled: body.manualBookingEnabled ?? true,
      modules: {
        citas: body.citas ?? true,
        ventas: body.ventas ?? true,
        inventario: body.inventario ?? false,
      },
    });
  }

  @Patch(':tenantId')
  async updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: UpdateTenantDto,
  ) {
    const modPatch: Partial<TenantEntity['modules']> = {};
    if (body.citas !== undefined) {
      modPatch.citas = body.citas;
    }
    if (body.ventas !== undefined) {
      modPatch.ventas = body.ventas;
    }
    if (body.inventario !== undefined) {
      modPatch.inventario = body.inventario;
    }

    const updated = await this.sqlDbService.updateTenant(tenantId, {
      name: body.name,
      slug: body.slug,
      status: body.status,
      plan: body.plan,
      storefrontEnabled: body.storefrontEnabled,
      manualBookingEnabled: body.manualBookingEnabled,
      ...(Object.keys(modPatch).length ? { modules: modPatch } : {}),
    });
    if (!updated) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return updated;
  }

  @Delete(':tenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(@Param('tenantId') tenantId: string) {
    const deleted = await this.sqlDbService.deleteTenant(tenantId);
    if (!deleted) {
      throw new NotFoundException('Tenant no encontrado');
    }
  }
}
