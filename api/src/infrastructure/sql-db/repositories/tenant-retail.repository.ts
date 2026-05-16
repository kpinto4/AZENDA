import { Injectable } from '@nestjs/common';
import { PgClientService } from '../pg-client.service';
import { StoreVisitLogEntity, TenantSaleEntity } from '../sql-db.types';

@Injectable()
export class TenantRetailRepository {
  constructor(private readonly pg: PgClientService) {}

  private round2(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private mapStoreVisitRow(row: Record<string, unknown>): StoreVisitLogEntity {
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      customer: String(row.customer),
      detail: String(row.detail),
      createdAt: String(row.created_at),
    };
  }

  private mapTenantSaleRow(row: Record<string, unknown>): TenantSaleEntity {
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      saleDate: String(row.sale_date),
      total: Math.max(0, Number(row.total) || 0),
      method: String(row.method),
      linkedAppointmentId: row.linked_appointment_id == null ? null : String(row.linked_appointment_id),
      stockNote: row.stock_note == null ? null : String(row.stock_note),
      createdAt: String(row.created_at),
    };
  }

  /** DDL idempotente: `tenant_sales` + índice (uso en bootstrap y migraciones arranque). */
  async ensureSalesTable(): Promise<void> {
    await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS tenant_sales (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        sale_date TEXT NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        method TEXT NOT NULL,
        linked_appointment_id TEXT NULL,
        stock_note TEXT NULL,
        created_at TEXT NOT NULL,
        CONSTRAINT fk_sale_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
    await this.pg.ensureIndex(
      `CREATE INDEX IF NOT EXISTS idx_tenant_sales_tenant_created ON tenant_sales (tenant_id, created_at DESC)`,
    );
  }

  async listStoreVisitsByTenantId(tenantId: string): Promise<StoreVisitLogEntity[]> {
    const rows = await this.pg.queryRows(
      `
        SELECT id, tenant_id, customer, detail, created_at
        FROM store_visit_logs
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapStoreVisitRow(row as Record<string, unknown>));
  }

  async createStoreVisitLog(data: {
    tenantId: string;
    customer: string;
    detail: string;
  }): Promise<StoreVisitLogEntity> {
    const id = `visit_${Date.now()}`;
    const createdAt = new Date().toISOString();
    await this.pg.exec(
      `
        INSERT INTO store_visit_logs (id, tenant_id, customer, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [id, data.tenantId, data.customer, data.detail, createdAt],
    );

    return {
      id,
      tenantId: data.tenantId,
      customer: data.customer,
      detail: data.detail,
      createdAt,
    };
  }

  async listTenantSalesByTenantId(tenantId: string): Promise<TenantSaleEntity[]> {
    const rows = await this.pg.queryRows(
      `
        SELECT id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at
        FROM tenant_sales
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `,
      [tenantId],
    );
    return rows.map((row) => this.mapTenantSaleRow(row as Record<string, unknown>));
  }

  async insertTenantSale(data: {
    tenantId: string;
    saleDate: string;
    total: number;
    method: string;
    linkedAppointmentId: string | null;
    stockNote: string | null;
  }): Promise<TenantSaleEntity> {
    const id = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const createdAt = new Date().toISOString();
    const totalRounded = this.round2(Math.max(0, Number(data.total) || 0));
    await this.pg.exec(
      `
        INSERT INTO tenant_sales (id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        data.tenantId,
        data.saleDate,
        totalRounded,
        data.method.trim(),
        data.linkedAppointmentId,
        data.stockNote,
        createdAt,
      ],
    );
    return {
      id,
      tenantId: data.tenantId,
      saleDate: data.saleDate,
      total: totalRounded,
      method: data.method.trim(),
      linkedAppointmentId: data.linkedAppointmentId,
      stockNote: data.stockNote,
      createdAt,
    };
  }
}
