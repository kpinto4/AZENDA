import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppSystem, AuthUser, UserRole } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { TenantBrandingEntity } from '../infrastructure/sql-db/sql-db.types';
import { CreateTenantEmployeeDto } from './dto/create-tenant-employee.dto';
import { MoveCatalogItemDto } from './dto/move-catalog-item.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { UpdateTenantEmployeeDto } from './dto/update-tenant-employee.dto';
import { UpsertTenantProductDto } from './dto/upsert-tenant-product.dto';
import { UpsertTenantServiceDto } from './dto/upsert-tenant-service.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { SimulateUpgradeDto } from './dto/simulate-upgrade.dto';
import { ApplyStockMovementDto } from './dto/apply-stock-movement.dto';
import { normalizePromoFields } from '../common/promo-schedule.util';
import { CatalogPromoFieldsDto } from './dto/catalog-promo-fields.dto';

@Injectable()
export class TenantService {
  constructor(private readonly sqlDbService: SqlDbService) {}

  private promoPayloadFromDto(dto: CatalogPromoFieldsDto) {
    return normalizePromoFields({
      promoEnabled: dto.promoEnabled,
      promoPrice: dto.promoPrice,
      promoScheduleType: dto.promoScheduleType,
      promoDays: dto.promoDays,
      promoStartDate: dto.promoStartDate,
      promoEndDate: dto.promoEndDate,
      promoLabel: dto.promoLabel,
    });
  }

  async getTenantContext(currentUser: AuthUser) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return {
        tenant: null,
        message: 'Super admin sin tenant fijo',
      };
    }

    if (!currentUser.tenantId) {
      throw new NotFoundException('Usuario sin tenant asignado');
    }

    const tenant = await this.sqlDbService.findTenantById(currentUser.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return { tenant };
  }

  async updateTenantSettings(
    currentUser: AuthUser,
    dto: UpdateTenantSettingsDto,
  ) {
    if (!currentUser.tenantId) {
      throw new NotFoundException('Usuario sin tenant asignado');
    }
    const updated = await this.sqlDbService.updateTenant(currentUser.tenantId, {
      manualBookingEnabled: dto.manualBookingEnabled,
    });
    if (!updated) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return { tenant: updated };
  }

  async listCatalog(currentUser: AuthUser) {
    const tenantId = this.requireTenantId(currentUser);
    const [products, services, branding] = await Promise.all([
      this.sqlDbService.listProductsByTenantId(tenantId),
      this.sqlDbService.listServicesByTenantId(tenantId),
      this.sqlDbService.getTenantBranding(tenantId),
    ]);
    return {
      products,
      services,
      branding,
    };
  }

  async getBillingStatus(currentUser: AuthUser) {
    const tenantId = this.requireTenantId(currentUser);
    const tenant = await this.sqlDbService.findTenantById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    const snapshot = await this.sqlDbService.getTenantBillingSnapshot(tenantId);
    return {
      tenantId,
      plan: tenant.plan,
      status: tenant.status,
      subscriptionStartedAt: tenant.subscriptionStartedAt,
      billing: snapshot,
    };
  }

  async simulateUpgrade(currentUser: AuthUser, dto: SimulateUpgradeDto) {
    const tenantId = this.requireTenantId(currentUser);
    const quote = await this.sqlDbService.getUpgradeQuote({
      tenantId,
      targetPlan: dto.targetPlan,
      targetCycle: dto.targetCycle,
    });
    if (!quote) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return quote;
  }

  async createProduct(currentUser: AuthUser, dto: UpsertTenantProductDto) {
    const tenantId = this.requireTenantId(currentUser);
    return this.sqlDbService.createTenantProduct(tenantId, {
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      sku: dto.sku,
      stock: dto.stock,
      imageUrl: dto.imageUrl ?? null,
      ...this.promoPayloadFromDto(dto),
    });
  }

  async updateProduct(
    currentUser: AuthUser,
    productId: string,
    dto: UpsertTenantProductDto,
  ) {
    const tenantId = this.requireTenantId(currentUser);
    const row = await this.sqlDbService.updateTenantProduct(
      tenantId,
      productId,
      {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        sku: dto.sku,
        stock: dto.stock,
        imageUrl: dto.imageUrl,
        ...this.promoPayloadFromDto(dto),
      },
    );
    if (!row) {
      throw new NotFoundException('Producto no encontrado');
    }
    return row;
  }

  async deleteProduct(currentUser: AuthUser, productId: string) {
    const tenantId = this.requireTenantId(currentUser);
    const ok = await this.sqlDbService.deleteTenantProduct(tenantId, productId);
    if (!ok) {
      throw new NotFoundException('Producto no encontrado');
    }
    return { ok: true };
  }

  async moveProduct(
    currentUser: AuthUser,
    productId: string,
    dto: MoveCatalogItemDto,
  ) {
    const tenantId = this.requireTenantId(currentUser);
    await this.sqlDbService.moveTenantProduct(
      tenantId,
      productId,
      dto.direction,
    );
    return { ok: true };
  }

  async createService(currentUser: AuthUser, dto: UpsertTenantServiceDto) {
    const tenantId = this.requireTenantId(currentUser);
    return this.sqlDbService.createTenantService(tenantId, {
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      durationMinutes: dto.durationMinutes,
      ...this.promoPayloadFromDto(dto),
    });
  }

  async updateService(
    currentUser: AuthUser,
    serviceId: string,
    dto: UpsertTenantServiceDto,
  ) {
    const tenantId = this.requireTenantId(currentUser);
    const row = await this.sqlDbService.updateTenantService(
      tenantId,
      serviceId,
      {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        durationMinutes: dto.durationMinutes,
        ...this.promoPayloadFromDto(dto),
      },
    );
    if (!row) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return row;
  }

  async deleteService(currentUser: AuthUser, serviceId: string) {
    const tenantId = this.requireTenantId(currentUser);
    const ok = await this.sqlDbService.deleteTenantService(tenantId, serviceId);
    if (!ok) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return { ok: true };
  }

  async moveService(
    currentUser: AuthUser,
    serviceId: string,
    dto: MoveCatalogItemDto,
  ) {
    const tenantId = this.requireTenantId(currentUser);
    await this.sqlDbService.moveTenantService(
      tenantId,
      serviceId,
      dto.direction,
    );
    return { ok: true };
  }

  async updateBranding(currentUser: AuthUser, dto: UpdateTenantBrandingDto) {
    const tenantId = this.requireTenantId(currentUser);
    const patch: Partial<Omit<TenantBrandingEntity, 'tenantId'>> = {
      ...dto,
      posPaymentMethodsJson:
        dto.posPaymentMethodsJson === null ||
        dto.posPaymentMethodsJson === undefined
          ? undefined
          : dto.posPaymentMethodsJson,
    };
    return this.sqlDbService.updateTenantBranding(tenantId, patch);
  }

  async listEmployees(currentUser: AuthUser) {
    const tenantId = this.requireTenantId(currentUser);
    const users = await this.sqlDbService.listUsersByTenantId(tenantId);
    // El admin del negocio no es un empleado: solo listamos EMPLEADO.
    return users
      .filter((u) => u.role === UserRole.EMPLEADO)
      .map((u) => ({
        id: u.id,
        name: u.email.split('@')[0],
        email: u.email,
        role: 'EMPLEADO' as const,
        status: u.status,
      }));
  }

  async createEmployee(currentUser: AuthUser, dto: CreateTenantEmployeeDto) {
    const tenantId = this.requireTenantId(currentUser);
    const created = await this.sqlDbService.createUser({
      id: `usr_${Date.now()}`,
      email: dto.email.trim().toLowerCase(),
      password: dto.password?.trim() || 'azenda123',
      role: UserRole.EMPLEADO,
      tenantId,
      systems: [AppSystem.TENANT],
      status: 'ACTIVE',
    });
    return {
      id: created.id,
      name: dto.name.trim(),
      email: created.email,
      role: 'EMPLEADO' as const,
      status: created.status,
    };
  }

  async updateEmployee(
    currentUser: AuthUser,
    userId: string,
    dto: UpdateTenantEmployeeDto,
  ) {
    const tenantId = this.requireTenantId(currentUser);
    const current = await this.sqlDbService.findUserById(userId);
    if (!current || current.tenantId !== tenantId) {
      throw new NotFoundException('Empleado no encontrado');
    }
    if (current.role === UserRole.ADMIN) {
      throw new NotFoundException('El admin del negocio no se gestiona como empleado');
    }
    const pwd = dto.password?.trim();
    const updated = await this.sqlDbService.updateUser(userId, {
      email: dto.email?.trim().toLowerCase(),
      ...(pwd ? { password: pwd } : {}),
      role: UserRole.EMPLEADO,
      systems: [AppSystem.TENANT],
    });
    if (!updated) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return {
      id: updated.id,
      name: dto.name?.trim() || updated.email.split('@')[0],
      email: updated.email,
      role: 'EMPLEADO' as const,
      status: updated.status,
    };
  }

  async deleteEmployee(currentUser: AuthUser, userId: string) {
    const tenantId = this.requireTenantId(currentUser);
    const current = await this.sqlDbService.findUserById(userId);
    if (!current || current.tenantId !== tenantId) {
      throw new NotFoundException('Empleado no encontrado');
    }
    if (current.role === UserRole.ADMIN) {
      throw new NotFoundException('No se puede eliminar al admin del negocio desde empleados');
    }
    const ok = await this.sqlDbService.deleteUserByTenant(userId, tenantId);
    if (!ok) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return { ok: true };
  }

  async listStockMovements(currentUser: AuthUser) {
    const tenantId = this.requireTenantId(currentUser);
    return this.sqlDbService.listStockMovementsByTenantId(tenantId, 50);
  }

  async applyStockMovement(currentUser: AuthUser, dto: ApplyStockMovementDto) {
    const tenantId = this.requireTenantId(currentUser);
    const delta = Number(dto.delta);
    if (!delta || !Number.isFinite(delta)) {
      throw new BadRequestException('Delta invalido');
    }
    const products = await this.sqlDbService.listProductsByTenantId(tenantId);
    const product = products.find((p) => p.id === dto.productId.trim());
    if (!product) {
      throw new BadRequestException('Producto no encontrado');
    }
    const nextStock = product.stock + delta;
    if (nextStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente (disponible: ${product.stock})`,
      );
    }
    await this.sqlDbService.updateTenantProduct(tenantId, product.id, {
      stock: nextStock,
    });
    return this.sqlDbService.insertStockMovement({
      tenantId,
      productId: product.id,
      productName: product.name,
      delta,
      reason: dto.reason.trim(),
    });
  }

  private requireTenantId(currentUser: AuthUser): string {
    if (!currentUser.tenantId) {
      throw new NotFoundException('Usuario sin tenant asignado');
    }
    return currentUser.tenantId;
  }
}
