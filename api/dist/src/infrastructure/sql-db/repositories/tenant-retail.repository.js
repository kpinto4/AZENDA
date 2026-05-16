"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRetailRepository = void 0;
const common_1 = require("@nestjs/common");
const pg_client_service_1 = require("../pg-client.service");
let TenantRetailRepository = class TenantRetailRepository {
    constructor(pg) {
        this.pg = pg;
    }
    round2(value) {
        return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    }
    mapStoreVisitRow(row) {
        return {
            id: String(row.id),
            tenantId: String(row.tenant_id),
            customer: String(row.customer),
            detail: String(row.detail),
            createdAt: String(row.created_at),
        };
    }
    mapTenantSaleRow(row) {
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
    async ensureSalesTable() {
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
        await this.pg.ensureIndex(`CREATE INDEX IF NOT EXISTS idx_tenant_sales_tenant_created ON tenant_sales (tenant_id, created_at DESC)`);
    }
    async listStoreVisitsByTenantId(tenantId) {
        const rows = await this.pg.queryRows(`
        SELECT id, tenant_id, customer, detail, created_at
        FROM store_visit_logs
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `, [tenantId]);
        return rows.map((row) => this.mapStoreVisitRow(row));
    }
    async createStoreVisitLog(data) {
        const id = `visit_${Date.now()}`;
        const createdAt = new Date().toISOString();
        await this.pg.exec(`
        INSERT INTO store_visit_logs (id, tenant_id, customer, detail, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [id, data.tenantId, data.customer, data.detail, createdAt]);
        return {
            id,
            tenantId: data.tenantId,
            customer: data.customer,
            detail: data.detail,
            createdAt,
        };
    }
    async listTenantSalesByTenantId(tenantId) {
        const rows = await this.pg.queryRows(`
        SELECT id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at
        FROM tenant_sales
        WHERE tenant_id = ?
        ORDER BY created_at DESC
      `, [tenantId]);
        return rows.map((row) => this.mapTenantSaleRow(row));
    }
    async insertTenantSale(data) {
        const id = `sale_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const createdAt = new Date().toISOString();
        const totalRounded = this.round2(Math.max(0, Number(data.total) || 0));
        await this.pg.exec(`
        INSERT INTO tenant_sales (id, tenant_id, sale_date, total, method, linked_appointment_id, stock_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
            id,
            data.tenantId,
            data.saleDate,
            totalRounded,
            data.method.trim(),
            data.linkedAppointmentId,
            data.stockNote,
            createdAt,
        ]);
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
};
exports.TenantRetailRepository = TenantRetailRepository;
exports.TenantRetailRepository = TenantRetailRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService])
], TenantRetailRepository);
//# sourceMappingURL=tenant-retail.repository.js.map