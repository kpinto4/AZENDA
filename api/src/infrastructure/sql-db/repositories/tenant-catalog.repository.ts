import { Injectable } from '@nestjs/common';
import { normalizeServiceDurationMinutes } from '../../../common/service-duration.util';
import {
  inferPromoFieldsFromLegacy,
  normalizePromoFields,
  parsePromoDaysJson,
  serializePromoDays,
  type CatalogPromoFields,
  type PromoScheduleType,
} from '../../../common/promo-schedule.util';
import { PgClientService } from '../pg-client.service';
import { TenantProductEntity, TenantServiceEntity } from '../sql-db.types';

type PromoWriteInput = Partial<CatalogPromoFields> & {
  promoPrice?: number | null;
  promoLabel?: string | null;
};

@Injectable()
export class TenantCatalogRepository {
  constructor(private readonly pg: PgClientService) {}

  private mapPromoFromRow(
    row: Record<string, unknown>,
    legacyLabel: string | null,
  ): CatalogPromoFields {
    if (row.promo_enabled != null) {
      const normalized = normalizePromoFields({
        promoEnabled: Boolean(row.promo_enabled),
        promoPrice:
          row.promo_price == null
            ? null
            : Math.max(0, Number(row.promo_price) || 0),
        promoScheduleType:
          row.promo_schedule_type == null
            ? null
            : (String(row.promo_schedule_type) as PromoScheduleType),
        promoDays: parsePromoDaysJson(
          row.promo_days_json == null ? null : String(row.promo_days_json),
        ),
        promoStartDate:
          row.promo_start_date == null ? null : String(row.promo_start_date),
        promoEndDate:
          row.promo_end_date == null ? null : String(row.promo_end_date),
        promoLabel: legacyLabel,
      });
      return normalized;
    }
    return inferPromoFieldsFromLegacy(
      row.promo_price == null
        ? null
        : Math.max(0, Number(row.promo_price) || 0),
      legacyLabel,
    );
  }

  private resolvePromoForWrite(
    patch: PromoWriteInput | undefined,
    current: CatalogPromoFields,
  ): CatalogPromoFields {
    if (!patch) {
      return current;
    }
    return normalizePromoFields({
      promoEnabled: patch.promoEnabled ?? current.promoEnabled,
      promoPrice:
        patch.promoPrice !== undefined ? patch.promoPrice : current.promoPrice,
      promoScheduleType:
        patch.promoScheduleType !== undefined
          ? patch.promoScheduleType
          : current.promoScheduleType,
      promoDays: patch.promoDays !== undefined ? patch.promoDays : current.promoDays,
      promoStartDate:
        patch.promoStartDate !== undefined
          ? patch.promoStartDate
          : current.promoStartDate,
      promoEndDate:
        patch.promoEndDate !== undefined ? patch.promoEndDate : current.promoEndDate,
      promoLabel: patch.promoLabel !== undefined ? patch.promoLabel : current.promoLabel,
    });
  }

  private mapTenantProductRow(
    row: Record<string, unknown>,
  ): TenantProductEntity {
    const promoLabel =
      row.promo_label == null ? null : String(row.promo_label).trim() || null;
    const promo = this.mapPromoFromRow(row, promoLabel);
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      name: String(row.name),
      description: row.description == null ? null : String(row.description),
      price: Math.max(0, Number(row.price) || 0),
      promoPrice: promo.promoPrice,
      promoEnabled: promo.promoEnabled,
      promoScheduleType: promo.promoScheduleType,
      promoDays: promo.promoDays,
      promoStartDate: promo.promoStartDate,
      promoEndDate: promo.promoEndDate,
      promoLabel: promo.promoLabel,
      sku: String(row.sku),
      stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
      catalogOrder: Number(row.catalog_order) || 0,
      imageUrl: row.image_url == null ? null : String(row.image_url),
    };
  }

  private mapTenantServiceRow(
    row: Record<string, unknown>,
  ): TenantServiceEntity {
    const legacyLabel =
      row.promo_label == null ? null : String(row.promo_label).trim() || null;
    const promo = this.mapPromoFromRow(row, legacyLabel);
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      name: String(row.name),
      description: row.description == null ? null : String(row.description),
      price: Math.max(0, Number(row.price) || 0),
      promoPrice: promo.promoPrice,
      promoEnabled: promo.promoEnabled,
      promoScheduleType: promo.promoScheduleType,
      promoDays: promo.promoDays,
      promoStartDate: promo.promoStartDate,
      promoEndDate: promo.promoEndDate,
      promoLabel: promo.promoLabel,
      durationMinutes: normalizeServiceDurationMinutes(
        row.duration_minutes,
        String(row.name),
      ),
      catalogOrder: Number(row.catalog_order) || 0,
    };
  }

  private promoSelectColumns(): string {
    return `promo_price, promo_enabled, promo_schedule_type, promo_days_json, promo_start_date, promo_end_date, promo_label`;
  }

  async listProductsByTenantId(
    tenantId: string,
  ): Promise<TenantProductEntity[]> {
    const rows = await this.pg.queryRows(
      `
        SELECT id, tenant_id, name, description, price, sku, stock, catalog_order, image_url,
               ${this.promoSelectColumns()}
        FROM tenant_products
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `,
      [tenantId],
    );
    return rows.map((row) =>
      this.mapTenantProductRow(row as Record<string, unknown>),
    );
  }

  async createTenantProduct(
    tenantId: string,
    data: Omit<TenantProductEntity, 'id' | 'tenantId' | 'catalogOrder'>,
  ): Promise<TenantProductEntity> {
    const id = `prd_${Date.now()}`;
    const rowOrder = await this.pg.queryOne(
      `SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_products WHERE tenant_id = ?`,
      [tenantId],
    );
    const catalogOrder = Number(rowOrder?.next_order ?? 0);
    const promo = normalizePromoFields(data);
    await this.pg.exec(
      `
        INSERT INTO tenant_products (
          id, tenant_id, name, description, price, promo_price, promo_enabled, promo_schedule_type,
          promo_days_json, promo_start_date, promo_end_date, promo_label, sku, stock, catalog_order, image_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        tenantId,
        data.name.trim(),
        data.description?.trim() || null,
        Math.max(0, Number(data.price) || 0),
        promo.promoPrice,
        promo.promoEnabled,
        promo.promoScheduleType,
        serializePromoDays(promo.promoDays),
        promo.promoStartDate,
        promo.promoEndDate,
        promo.promoLabel,
        data.sku.trim(),
        Math.max(0, Math.floor(Number(data.stock) || 0)),
        catalogOrder,
        data.imageUrl ?? null,
      ],
    );
    const list = await this.listProductsByTenantId(tenantId);
    return list.find((p) => p.id === id)!;
  }

  async updateTenantProduct(
    tenantId: string,
    productId: string,
    patch: Omit<
      Partial<TenantProductEntity>,
      'id' | 'tenantId' | 'catalogOrder'
    >,
  ): Promise<TenantProductEntity | undefined> {
    const list = await this.listProductsByTenantId(tenantId);
    const current = list.find((p) => p.id === productId);
    if (!current) {
      return undefined;
    }
    const promo = this.resolvePromoForWrite(patch, current);
    const next = {
      ...current,
      ...patch,
      name: patch.name?.trim() ?? current.name,
      description:
        patch.description === undefined
          ? current.description
          : patch.description?.trim() || null,
      sku: patch.sku?.trim() ?? current.sku,
      price:
        patch.price === undefined
          ? current.price
          : Math.max(0, Number(patch.price) || 0),
      stock:
        patch.stock === undefined
          ? current.stock
          : Math.max(0, Math.floor(Number(patch.stock) || 0)),
      imageUrl:
        patch.imageUrl === undefined
          ? current.imageUrl
          : patch.imageUrl === ''
            ? null
            : patch.imageUrl,
      ...promo,
    };
    await this.pg.exec(
      `
        UPDATE tenant_products
        SET name = ?, description = ?, price = ?, promo_price = ?, promo_enabled = ?, promo_schedule_type = ?,
            promo_days_json = ?, promo_start_date = ?, promo_end_date = ?, promo_label = ?,
            sku = ?, stock = ?, image_url = ?
        WHERE id = ? AND tenant_id = ?
      `,
      [
        next.name,
        next.description,
        next.price,
        next.promoPrice,
        next.promoEnabled,
        next.promoScheduleType,
        serializePromoDays(next.promoDays),
        next.promoStartDate,
        next.promoEndDate,
        next.promoLabel,
        next.sku,
        next.stock,
        next.imageUrl,
        productId,
        tenantId,
      ],
    );
    const after = await this.listProductsByTenantId(tenantId);
    return after.find((p) => p.id === productId);
  }

  async deleteTenantProduct(
    tenantId: string,
    productId: string,
  ): Promise<boolean> {
    const list = await this.listProductsByTenantId(tenantId);
    const exists = list.some((p) => p.id === productId);
    if (!exists) {
      return false;
    }
    await this.pg.exec(
      `DELETE FROM tenant_products WHERE id = ? AND tenant_id = ?`,
      [productId, tenantId],
    );
    return true;
  }

  async moveTenantProduct(
    tenantId: string,
    productId: string,
    direction: -1 | 1,
  ): Promise<void> {
    const sorted = await this.listProductsByTenantId(tenantId);
    const idx = sorted.findIndex((p) => p.id === productId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= sorted.length) {
      return;
    }
    const a = sorted[idx];
    const b = sorted[j];
    await this.pg.exec(
      `UPDATE tenant_products SET catalog_order = ? WHERE id = ?`,
      [b.catalogOrder, a.id],
    );
    await this.pg.exec(
      `UPDATE tenant_products SET catalog_order = ? WHERE id = ?`,
      [a.catalogOrder, b.id],
    );
  }

  async listServicesByTenantId(
    tenantId: string,
  ): Promise<TenantServiceEntity[]> {
    const rows = await this.pg.queryRows(
      `
        SELECT id, tenant_id, name, description, price, duration_minutes, catalog_order,
               ${this.promoSelectColumns()}
        FROM tenant_services
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `,
      [tenantId],
    );
    return rows.map((row) =>
      this.mapTenantServiceRow(row as Record<string, unknown>),
    );
  }

  async createTenantService(
    tenantId: string,
    data: Omit<TenantServiceEntity, 'id' | 'tenantId' | 'catalogOrder' | 'durationMinutes'> & {
      durationMinutes?: number;
    },
  ): Promise<TenantServiceEntity> {
    const id = `svc_${Date.now()}`;
    const rowOrder = await this.pg.queryOne(
      `SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_services WHERE tenant_id = ?`,
      [tenantId],
    );
    const catalogOrder = Number(rowOrder?.next_order ?? 0);
    const durationMinutes = normalizeServiceDurationMinutes(
      data.durationMinutes,
      data.name,
    );
    const promo = normalizePromoFields(data);
    await this.pg.exec(
      `
        INSERT INTO tenant_services (
          id, tenant_id, name, description, price, promo_price, promo_enabled, promo_schedule_type,
          promo_days_json, promo_start_date, promo_end_date, promo_label, duration_minutes, catalog_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        tenantId,
        data.name.trim(),
        data.description?.trim() || null,
        Math.max(0, Number(data.price) || 0),
        promo.promoPrice,
        promo.promoEnabled,
        promo.promoScheduleType,
        serializePromoDays(promo.promoDays),
        promo.promoStartDate,
        promo.promoEndDate,
        promo.promoLabel,
        durationMinutes,
        catalogOrder,
      ],
    );
    const list = await this.listServicesByTenantId(tenantId);
    return list.find((s) => s.id === id)!;
  }

  async updateTenantService(
    tenantId: string,
    serviceId: string,
    patch: Omit<
      Partial<TenantServiceEntity>,
      'id' | 'tenantId' | 'catalogOrder'
    >,
  ): Promise<TenantServiceEntity | undefined> {
    const list = await this.listServicesByTenantId(tenantId);
    const current = list.find((s) => s.id === serviceId);
    if (!current) {
      return undefined;
    }
    const promo = this.resolvePromoForWrite(patch, current);
    const next = {
      ...current,
      ...patch,
      name: patch.name?.trim() ?? current.name,
      description:
        patch.description === undefined
          ? current.description
          : patch.description?.trim() || null,
      price:
        patch.price === undefined
          ? current.price
          : Math.max(0, Number(patch.price) || 0),
      durationMinutes:
        patch.durationMinutes === undefined
          ? current.durationMinutes
          : normalizeServiceDurationMinutes(
              patch.durationMinutes,
              patch.name ?? current.name,
            ),
      ...promo,
    };
    await this.pg.exec(
      `
        UPDATE tenant_services
        SET name = ?, description = ?, price = ?, promo_price = ?, promo_enabled = ?, promo_schedule_type = ?,
            promo_days_json = ?, promo_start_date = ?, promo_end_date = ?, promo_label = ?, duration_minutes = ?
        WHERE id = ? AND tenant_id = ?
      `,
      [
        next.name,
        next.description,
        next.price,
        next.promoPrice,
        next.promoEnabled,
        next.promoScheduleType,
        serializePromoDays(next.promoDays),
        next.promoStartDate,
        next.promoEndDate,
        next.promoLabel,
        next.durationMinutes,
        serviceId,
        tenantId,
      ],
    );
    const after = await this.listServicesByTenantId(tenantId);
    return after.find((s) => s.id === serviceId);
  }

  async deleteTenantService(
    tenantId: string,
    serviceId: string,
  ): Promise<boolean> {
    const list = await this.listServicesByTenantId(tenantId);
    const exists = list.some((s) => s.id === serviceId);
    if (!exists) {
      return false;
    }
    await this.pg.exec(
      `DELETE FROM tenant_services WHERE id = ? AND tenant_id = ?`,
      [serviceId, tenantId],
    );
    return true;
  }

  async moveTenantService(
    tenantId: string,
    serviceId: string,
    direction: -1 | 1,
  ): Promise<void> {
    const sorted = await this.listServicesByTenantId(tenantId);
    const idx = sorted.findIndex((s) => s.id === serviceId);
    const j = idx + direction;
    if (idx < 0 || j < 0 || j >= sorted.length) {
      return;
    }
    const a = sorted[idx];
    const b = sorted[j];
    await this.pg.exec(
      `UPDATE tenant_services SET catalog_order = ? WHERE id = ?`,
      [b.catalogOrder, a.id],
    );
    await this.pg.exec(
      `UPDATE tenant_services SET catalog_order = ? WHERE id = ?`,
      [a.catalogOrder, b.id],
    );
  }
}
