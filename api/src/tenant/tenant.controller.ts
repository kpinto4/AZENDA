import {
  Body,
  Controller,
  Delete,
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
import { TenantStatusGuard } from '../auth/guards/tenant-status.guard';
import { MoveCatalogItemDto } from './dto/move-catalog-item.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { CreateTenantEmployeeDto } from './dto/create-tenant-employee.dto';
import { UpdateTenantEmployeeDto } from './dto/update-tenant-employee.dto';
import { UpsertTenantProductDto } from './dto/upsert-tenant-product.dto';
import { UpsertTenantServiceDto } from './dto/upsert-tenant-service.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { SimulateUpgradeDto } from './dto/simulate-upgrade.dto';
import { TenantService } from './tenant.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard, TenantStatusGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLEADO)
@Systems(AppSystem.TENANT)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('context')
  getTenantContext(@Req() req: AuthenticatedRequest) {
    return this.tenantService.getTenantContext(req.user);
  }

  @Patch('settings')
  @Roles(UserRole.ADMIN)
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantService.updateTenantSettings(req.user, dto);
  }

  @Get('catalog')
  getCatalog(@Req() req: AuthenticatedRequest) {
    return this.tenantService.listCatalog(req.user);
  }

  @Get('billing/status')
  @Roles(UserRole.ADMIN)
  getBillingStatus(@Req() req: AuthenticatedRequest) {
    return this.tenantService.getBillingStatus(req.user);
  }

  @Post('billing/upgrade-quote')
  @Roles(UserRole.ADMIN)
  getUpgradeQuote(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SimulateUpgradeDto,
  ) {
    return this.tenantService.simulateUpgrade(req.user, dto);
  }

  @Post('catalog/products')
  @Roles(UserRole.ADMIN)
  createProduct(@Req() req: AuthenticatedRequest, @Body() dto: UpsertTenantProductDto) {
    return this.tenantService.createProduct(req.user, dto);
  }

  @Patch('catalog/products/:productId')
  @Roles(UserRole.ADMIN)
  updateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpsertTenantProductDto,
  ) {
    return this.tenantService.updateProduct(req.user, productId, dto);
  }

  @Delete('catalog/products/:productId')
  @Roles(UserRole.ADMIN)
  deleteProduct(@Req() req: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.tenantService.deleteProduct(req.user, productId);
  }

  @Patch('catalog/products/:productId/move')
  @Roles(UserRole.ADMIN)
  moveProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: MoveCatalogItemDto,
  ) {
    return this.tenantService.moveProduct(req.user, productId, dto);
  }

  @Post('catalog/services')
  @Roles(UserRole.ADMIN)
  createService(@Req() req: AuthenticatedRequest, @Body() dto: UpsertTenantServiceDto) {
    return this.tenantService.createService(req.user, dto);
  }

  @Patch('catalog/services/:serviceId')
  @Roles(UserRole.ADMIN)
  updateService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpsertTenantServiceDto,
  ) {
    return this.tenantService.updateService(req.user, serviceId, dto);
  }

  @Delete('catalog/services/:serviceId')
  @Roles(UserRole.ADMIN)
  deleteService(@Req() req: AuthenticatedRequest, @Param('serviceId') serviceId: string) {
    return this.tenantService.deleteService(req.user, serviceId);
  }

  @Patch('catalog/services/:serviceId/move')
  @Roles(UserRole.ADMIN)
  moveService(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Body() dto: MoveCatalogItemDto,
  ) {
    return this.tenantService.moveService(req.user, serviceId, dto);
  }

  @Patch('branding')
  @Roles(UserRole.ADMIN)
  updateBranding(@Req() req: AuthenticatedRequest, @Body() dto: UpdateTenantBrandingDto) {
    return this.tenantService.updateBranding(req.user, dto);
  }

  @Get('employees')
  @Roles(UserRole.ADMIN)
  listEmployees(@Req() req: AuthenticatedRequest) {
    return this.tenantService.listEmployees(req.user);
  }

  @Post('employees')
  @Roles(UserRole.ADMIN)
  createEmployee(@Req() req: AuthenticatedRequest, @Body() dto: CreateTenantEmployeeDto) {
    return this.tenantService.createEmployee(req.user, dto);
  }

  @Patch('employees/:userId')
  @Roles(UserRole.ADMIN)
  updateEmployee(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: UpdateTenantEmployeeDto,
  ) {
    return this.tenantService.updateEmployee(req.user, userId, dto);
  }

  @Delete('employees/:userId')
  @Roles(UserRole.ADMIN)
  deleteEmployee(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.tenantService.deleteEmployee(req.user, userId);
  }
}
