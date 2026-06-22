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
import { AdminTenantsService } from './admin-tenants.service';
import { defaultModulesForPlan } from '../infrastructure/sql-db/plan-modules';
import { TenantEntity } from '../infrastructure/sql-db/sql-db.types';
import { AdminUpgradeQuoteDto } from './dto/admin-upgrade-quote.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Systems(AppSystem.SUPER_ADMIN)
export class AdminTenantsController {
  constructor(private readonly adminTenants: AdminTenantsService) {}

  @Get()
  listTenants() {
    return this.adminTenants.listTenants();
  }

  @Get(':tenantId')
  async getTenantById(@Param('tenantId') tenantId: string) {
    const tenant = await this.adminTenants.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return tenant;
  }

  @Post(':tenantId/upgrade-quote')
  async upgradeQuote(
    @Param('tenantId') tenantId: string,
    @Body() body: AdminUpgradeQuoteDto,
  ) {
    const quote = await this.adminTenants.getUpgradeQuote({
      tenantId,
      targetPlan: body.targetPlan,
      targetCycle: body.targetCycle,
    });
    if (!quote) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return quote;
  }

  @Post()
  createTenant(@Body() body: CreateTenantDto) {
    const plan = body.plan ?? 'Trial';
    const planModules = defaultModulesForPlan(plan);
    return this.adminTenants.createTenant({
      id: body.id,
      name: body.name,
      slug: body.slug,
      status: body.status,
      plan,
      storefrontEnabled: body.storefrontEnabled ?? false,
      manualBookingEnabled: body.manualBookingEnabled ?? true,
      billingCycle: body.billingCycle ?? 'MONTHLY',
      modules: {
        citas: body.citas ?? planModules.citas,
        ventas: body.ventas ?? planModules.ventas,
        inventario: body.inventario ?? planModules.inventario,
      },
    });
  }

  @Post(':tenantId/activate-subscription')
  async activateSubscription(@Param('tenantId') tenantId: string) {
    return this.adminTenants.activateSubscription(tenantId);
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

    const updated = await this.adminTenants.updateTenant(tenantId, {
      name: body.name,
      slug: body.slug,
      status: body.status,
      plan: body.plan,
      storefrontEnabled: body.storefrontEnabled,
      manualBookingEnabled: body.manualBookingEnabled,
      billingCycle: body.billingCycle,
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
    const deleted = await this.adminTenants.deleteTenant(tenantId);
    if (!deleted) {
      throw new NotFoundException('Tenant no encontrado');
    }
  }
}
