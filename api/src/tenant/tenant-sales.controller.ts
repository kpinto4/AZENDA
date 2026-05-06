import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser, AppSystem, UserRole } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { Systems } from '../auth/decorators/systems.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantStatusGuard } from '../auth/guards/tenant-status.guard';
import { CreateTenantSaleDto } from './dto/create-tenant-sale.dto';
import { TenantSalesService } from './tenant-sales.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('tenant/ventas')
@UseGuards(JwtAuthGuard, RolesGuard, TenantStatusGuard)
@Roles(UserRole.ADMIN, UserRole.EMPLEADO)
@Systems(AppSystem.TENANT)
export class TenantSalesController {
  constructor(private readonly tenantSales: TenantSalesService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.tenantSales.list(req.user);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTenantSaleDto) {
    return this.tenantSales.create(req.user, dto);
  }
}
