import { Injectable, NotFoundException } from '@nestjs/common';
import { AppSystem, AuthUser, UserRole } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { CreateTenantEmployeeDto } from './dto/create-tenant-employee.dto';
import { MoveCatalogItemDto } from './dto/move-catalog-item.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { UpdateTenantEmployeeDto } from './dto/update-tenant-employee.dto';
import { UpsertTenantProductDto } from './dto/upsert-tenant-product.dto';
import { UpsertTenantServiceDto } from './dto/upsert-tenant-service.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

@Injectable()
export class TenantService {
  constructor(private readonly sqlDbService: SqlDbService) {}

  getTenantContext(currentUser: AuthUser) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return {
        tenant: null,
        message: 'Super admin sin tenant fijo',
      };
    }

    if (!currentUser.tenantId) {
      throw new NotFoundException('Usuario sin tenant asignado');
    }

    const tenant = this.sqlDbService.findTenantById(currentUser.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    return { tenant };
  }

  updateTenantSettings(currentUser: AuthUser, dto: UpdateTenantSettingsDto) {
    if (!currentUser.tenantId) {
      throw new NotFoundException('Usuario sin tenant asignado');
    }
    const updated = this.sqlDbService.updateTenant(currentUser.tenantId, {
      manualBookingEnabled: dto.manualBookingEnabled,
    });
    if (!updated) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return { tenant: updated };
  }

  listCatalog(currentUser: AuthUser) {
    const tenantId = this.requireTenantId(currentUser);
    return {
      products: this.sqlDbService.listProductsByTenantId(tenantId),
      services: this.sqlDbService.listServicesByTenantId(tenantId),
      branding: this.sqlDbService.getTenantBranding(tenantId),
    };
  }

  createProduct(currentUser: AuthUser, dto: UpsertTenantProductDto) {
    const tenantId = this.requireTenantId(currentUser);
    return this.sqlDbService.createTenantProduct(tenantId, {
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      promoPrice: dto.promoPrice ?? null,
      sku: dto.sku,
      stock: dto.stock,
      imageUrl: dto.imageUrl ?? null,
    });
  }

  updateProduct(currentUser: AuthUser, productId: string, dto: UpsertTenantProductDto) {
    const tenantId = this.requireTenantId(currentUser);
    const row = this.sqlDbService.updateTenantProduct(tenantId, productId, {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      promoPrice: dto.promoPrice,
      sku: dto.sku,
      stock: dto.stock,
      imageUrl: dto.imageUrl,
    });
    if (!row) {
      throw new NotFoundException('Producto no encontrado');
    }
    return row;
  }

  deleteProduct(currentUser: AuthUser, productId: string) {
    const tenantId = this.requireTenantId(currentUser);
    const ok = this.sqlDbService.deleteTenantProduct(tenantId, productId);
    if (!ok) {
      throw new NotFoundException('Producto no encontrado');
    }
    return { ok: true };
  }

  moveProduct(currentUser: AuthUser, productId: string, dto: MoveCatalogItemDto) {
    const tenantId = this.requireTenantId(currentUser);
    this.sqlDbService.moveTenantProduct(tenantId, productId, dto.direction);
    return { ok: true };
  }

  createService(currentUser: AuthUser, dto: UpsertTenantServiceDto) {
    const tenantId = this.requireTenantId(currentUser);
    return this.sqlDbService.createTenantService(tenantId, {
      name: dto.name,
      description: dto.description ?? null,
      price: dto.price,
      promoPrice: dto.promoPrice ?? null,
      promoLabel: dto.promoLabel ?? null,
    });
  }

  updateService(currentUser: AuthUser, serviceId: string, dto: UpsertTenantServiceDto) {
    const tenantId = this.requireTenantId(currentUser);
    const row = this.sqlDbService.updateTenantService(tenantId, serviceId, {
      name: dto.name,
      description: dto.description,
      price: dto.price,
      promoPrice: dto.promoPrice,
      promoLabel: dto.promoLabel,
    });
    if (!row) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return row;
  }

  deleteService(currentUser: AuthUser, serviceId: string) {
    const tenantId = this.requireTenantId(currentUser);
    const ok = this.sqlDbService.deleteTenantService(tenantId, serviceId);
    if (!ok) {
      throw new NotFoundException('Servicio no encontrado');
    }
    return { ok: true };
  }

  moveService(currentUser: AuthUser, serviceId: string, dto: MoveCatalogItemDto) {
    const tenantId = this.requireTenantId(currentUser);
    this.sqlDbService.moveTenantService(tenantId, serviceId, dto.direction);
    return { ok: true };
  }

  updateBranding(currentUser: AuthUser, dto: UpdateTenantBrandingDto) {
    const tenantId = this.requireTenantId(currentUser);
    return this.sqlDbService.updateTenantBranding(tenantId, dto);
  }

  listEmployees(currentUser: AuthUser) {
    const tenantId = this.requireTenantId(currentUser);
    return this.sqlDbService
      .listUsersByTenantId(tenantId)
      .filter((u) => u.role === UserRole.ADMIN || u.role === UserRole.EMPLEADO)
      .map((u) => ({
        id: u.id,
        name: u.email.split('@')[0],
        email: u.email,
        password: u.password,
        role: u.role === UserRole.ADMIN ? 'ADMIN' : 'EMPLEADO',
        status: u.status,
      }));
  }

  createEmployee(currentUser: AuthUser, dto: CreateTenantEmployeeDto) {
    const tenantId = this.requireTenantId(currentUser);
    const created = this.sqlDbService.createUser({
      id: `usr_${Date.now()}`,
      email: dto.email.trim().toLowerCase(),
      password: (dto.password?.trim() || 'azenda123'),
      role: dto.role === 'ADMIN' ? UserRole.ADMIN : UserRole.EMPLEADO,
      tenantId,
      systems: dto.role === 'ADMIN' ? [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING] : [AppSystem.TENANT],
      status: 'ACTIVE',
    });
    return {
      id: created.id,
      name: dto.name.trim(),
      email: created.email,
      password: created.password,
      role: created.role === UserRole.ADMIN ? 'ADMIN' : 'EMPLEADO',
      status: created.status,
    };
  }

  updateEmployee(currentUser: AuthUser, userId: string, dto: UpdateTenantEmployeeDto) {
    const tenantId = this.requireTenantId(currentUser);
    const current = this.sqlDbService.findUserById(userId);
    if (!current || current.tenantId !== tenantId) {
      throw new NotFoundException('Empleado no encontrado');
    }
    const role = dto.role
      ? dto.role === 'ADMIN'
        ? UserRole.ADMIN
        : UserRole.EMPLEADO
      : current.role;
    const updated = this.sqlDbService.updateUser(userId, {
      email: dto.email?.trim().toLowerCase(),
      password: dto.password?.trim(),
      role,
      systems: role === UserRole.ADMIN ? [AppSystem.TENANT, AppSystem.PUBLIC_BOOKING] : [AppSystem.TENANT],
    });
    if (!updated) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return {
      id: updated.id,
      name: (dto.name?.trim() || updated.email.split('@')[0]),
      email: updated.email,
      password: updated.password,
      role: updated.role === UserRole.ADMIN ? 'ADMIN' : 'EMPLEADO',
      status: updated.status,
    };
  }

  deleteEmployee(currentUser: AuthUser, userId: string) {
    const tenantId = this.requireTenantId(currentUser);
    const ok = this.sqlDbService.deleteUserByTenant(userId, tenantId);
    if (!ok) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return { ok: true };
  }

  private requireTenantId(currentUser: AuthUser): string {
    if (!currentUser.tenantId) {
      throw new NotFoundException('Usuario sin tenant asignado');
    }
    return currentUser.tenantId;
  }
}
