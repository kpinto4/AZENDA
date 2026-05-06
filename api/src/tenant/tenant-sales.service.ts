import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { SqlDbService } from '../infrastructure/sql-db/sql-db.service';
import { CreateTenantSaleDto } from './dto/create-tenant-sale.dto';

@Injectable()
export class TenantSalesService {
  constructor(private readonly sqlDb: SqlDbService) {}

  private async assertTenantSalesModule(user: AuthUser): Promise<string> {
    if (!user.tenantId) {
      throw new ForbiddenException('Usuario sin tenant');
    }
    const tenant = await this.sqlDb.findTenantById(user.tenantId);
    if (!tenant?.modules.ventas) {
      throw new ForbiddenException('El modulo de ventas no esta activo para este tenant');
    }
    return user.tenantId;
  }

  async list(user: AuthUser) {
    const tenantId = await this.assertTenantSalesModule(user);
    return this.sqlDb.listTenantSalesByTenantId(tenantId);
  }

  async create(user: AuthUser, dto: CreateTenantSaleDto) {
    const tenantId = await this.assertTenantSalesModule(user);
    const saleDate = this.normalizeSaleDate(dto.saleDate);
    const total = Number(dto.total);

    let linkedAppointmentId: string | null = null;
    if (dto.linkedAppointmentId?.trim()) {
      const appt = await this.sqlDb.findAppointmentById(dto.linkedAppointmentId.trim());
      if (!appt || appt.tenantId !== tenantId) {
        throw new BadRequestException('La cita vinculada no existe o no pertenece a este negocio');
      }
      linkedAppointmentId = appt.id;
    }

    let stockNote: string | null = null;
    if (dto.productId?.trim()) {
      const qty = dto.quantity ?? 1;
      const products = await this.sqlDb.listProductsByTenantId(tenantId);
      const product = products.find((p) => p.id === dto.productId!.trim());
      if (!product) {
        throw new BadRequestException('Producto no encontrado en el catalogo');
      }
      if (product.stock < qty) {
        throw new BadRequestException(`Stock insuficiente para ${product.name} (disponible: ${product.stock})`);
      }
      const nextStock = product.stock - qty;
      await this.sqlDb.updateTenantProduct(tenantId, product.id, { stock: nextStock });
      stockNote = `Stock: −${qty} · ${product.name}`;
    }

    return this.sqlDb.insertTenantSale({
      tenantId,
      saleDate,
      total,
      method: dto.method,
      linkedAppointmentId,
      stockNote,
    });
  }

  private normalizeSaleDate(input?: string): string {
    if (!input?.trim()) {
      return new Date().toISOString().slice(0, 10);
    }
    const t = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      return t;
    }
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Fecha de venta invalida');
    }
    return d.toISOString().slice(0, 10);
  }
}
