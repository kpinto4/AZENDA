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
exports.TenantCatalogRepository = void 0;
const common_1 = require("@nestjs/common");
const pg_client_service_1 = require("../pg-client.service");
let TenantCatalogRepository = class TenantCatalogRepository {
    constructor(pg) {
        this.pg = pg;
    }
    mapTenantProductRow(row) {
        return {
            id: String(row.id),
            tenantId: String(row.tenant_id),
            name: String(row.name),
            description: row.description == null ? null : String(row.description),
            price: Math.max(0, Number(row.price) || 0),
            promoPrice: row.promo_price == null ? null : Math.max(0, Number(row.promo_price) || 0),
            sku: String(row.sku),
            stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
            catalogOrder: Number(row.catalog_order) || 0,
            imageUrl: row.image_url == null ? null : String(row.image_url),
        };
    }
    mapTenantServiceRow(row) {
        return {
            id: String(row.id),
            tenantId: String(row.tenant_id),
            name: String(row.name),
            description: row.description == null ? null : String(row.description),
            price: Math.max(0, Number(row.price) || 0),
            promoPrice: row.promo_price == null ? null : Math.max(0, Number(row.promo_price) || 0),
            promoLabel: row.promo_label == null ? null : String(row.promo_label),
            catalogOrder: Number(row.catalog_order) || 0,
        };
    }
    async listProductsByTenantId(tenantId) {
        const rows = await this.pg.queryRows(`
        SELECT id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url
        FROM tenant_products
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `, [tenantId]);
        return rows.map((row) => this.mapTenantProductRow(row));
    }
    async createTenantProduct(tenantId, data) {
        const id = `prd_${Date.now()}`;
        const rowOrder = await this.pg.queryOne(`SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_products WHERE tenant_id = ?`, [tenantId]);
        const catalogOrder = Number(rowOrder?.next_order ?? 0);
        await this.pg.exec(`
        INSERT INTO tenant_products (id, tenant_id, name, description, price, promo_price, sku, stock, catalog_order, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
            id,
            tenantId,
            data.name.trim(),
            data.description?.trim() || null,
            Math.max(0, Number(data.price) || 0),
            data.promoPrice == null ? null : Math.max(0, Number(data.promoPrice) || 0),
            data.sku.trim(),
            Math.max(0, Math.floor(Number(data.stock) || 0)),
            catalogOrder,
            data.imageUrl ?? null,
        ]);
        const list = await this.listProductsByTenantId(tenantId);
        return list.find((p) => p.id === id);
    }
    async updateTenantProduct(tenantId, productId, patch) {
        const list = await this.listProductsByTenantId(tenantId);
        const current = list.find((p) => p.id === productId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            ...patch,
            name: patch.name?.trim() ?? current.name,
            description: patch.description === undefined ? current.description : patch.description?.trim() || null,
            sku: patch.sku?.trim() ?? current.sku,
            price: patch.price === undefined ? current.price : Math.max(0, Number(patch.price) || 0),
            promoPrice: patch.promoPrice === undefined
                ? current.promoPrice
                : patch.promoPrice == null
                    ? null
                    : Math.max(0, Number(patch.promoPrice) || 0),
            stock: patch.stock === undefined
                ? current.stock
                : Math.max(0, Math.floor(Number(patch.stock) || 0)),
            imageUrl: patch.imageUrl === undefined
                ? current.imageUrl
                : patch.imageUrl === ''
                    ? null
                    : patch.imageUrl,
        };
        await this.pg.exec(`
        UPDATE tenant_products
        SET name = ?, description = ?, price = ?, promo_price = ?, sku = ?, stock = ?, image_url = ?
        WHERE id = ? AND tenant_id = ?
      `, [
            next.name,
            next.description,
            next.price,
            next.promoPrice,
            next.sku,
            next.stock,
            next.imageUrl,
            productId,
            tenantId,
        ]);
        const after = await this.listProductsByTenantId(tenantId);
        return after.find((p) => p.id === productId);
    }
    async deleteTenantProduct(tenantId, productId) {
        const list = await this.listProductsByTenantId(tenantId);
        const exists = list.some((p) => p.id === productId);
        if (!exists) {
            return false;
        }
        await this.pg.exec(`DELETE FROM tenant_products WHERE id = ? AND tenant_id = ?`, [
            productId,
            tenantId,
        ]);
        return true;
    }
    async moveTenantProduct(tenantId, productId, direction) {
        const sorted = await this.listProductsByTenantId(tenantId);
        const idx = sorted.findIndex((p) => p.id === productId);
        const j = idx + direction;
        if (idx < 0 || j < 0 || j >= sorted.length) {
            return;
        }
        const a = sorted[idx];
        const b = sorted[j];
        await this.pg.exec(`UPDATE tenant_products SET catalog_order = ? WHERE id = ?`, [
            b.catalogOrder,
            a.id,
        ]);
        await this.pg.exec(`UPDATE tenant_products SET catalog_order = ? WHERE id = ?`, [
            a.catalogOrder,
            b.id,
        ]);
    }
    async listServicesByTenantId(tenantId) {
        const rows = await this.pg.queryRows(`
        SELECT id, tenant_id, name, description, price, promo_price, promo_label, catalog_order
        FROM tenant_services
        WHERE tenant_id = ?
        ORDER BY catalog_order ASC, name ASC
      `, [tenantId]);
        return rows.map((row) => this.mapTenantServiceRow(row));
    }
    async createTenantService(tenantId, data) {
        const id = `svc_${Date.now()}`;
        const rowOrder = await this.pg.queryOne(`SELECT COALESCE(MAX(catalog_order), -1) + 1 AS next_order FROM tenant_services WHERE tenant_id = ?`, [tenantId]);
        const catalogOrder = Number(rowOrder?.next_order ?? 0);
        await this.pg.exec(`
        INSERT INTO tenant_services (id, tenant_id, name, description, price, promo_price, promo_label, catalog_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
            id,
            tenantId,
            data.name.trim(),
            data.description?.trim() || null,
            Math.max(0, Number(data.price) || 0),
            data.promoPrice == null ? null : Math.max(0, Number(data.promoPrice) || 0),
            data.promoLabel?.trim() || null,
            catalogOrder,
        ]);
        const list = await this.listServicesByTenantId(tenantId);
        return list.find((s) => s.id === id);
    }
    async updateTenantService(tenantId, serviceId, patch) {
        const list = await this.listServicesByTenantId(tenantId);
        const current = list.find((s) => s.id === serviceId);
        if (!current) {
            return undefined;
        }
        const next = {
            ...current,
            ...patch,
            name: patch.name?.trim() ?? current.name,
            description: patch.description === undefined ? current.description : patch.description?.trim() || null,
            price: patch.price === undefined ? current.price : Math.max(0, Number(patch.price) || 0),
            promoPrice: patch.promoPrice === undefined
                ? current.promoPrice
                : patch.promoPrice == null
                    ? null
                    : Math.max(0, Number(patch.promoPrice) || 0),
            promoLabel: patch.promoLabel === undefined ? current.promoLabel : patch.promoLabel?.trim() || null,
        };
        await this.pg.exec(`
        UPDATE tenant_services
        SET name = ?, description = ?, price = ?, promo_price = ?, promo_label = ?
        WHERE id = ? AND tenant_id = ?
      `, [next.name, next.description, next.price, next.promoPrice, next.promoLabel, serviceId, tenantId]);
        const after = await this.listServicesByTenantId(tenantId);
        return after.find((s) => s.id === serviceId);
    }
    async deleteTenantService(tenantId, serviceId) {
        const list = await this.listServicesByTenantId(tenantId);
        const exists = list.some((s) => s.id === serviceId);
        if (!exists) {
            return false;
        }
        await this.pg.exec(`DELETE FROM tenant_services WHERE id = ? AND tenant_id = ?`, [
            serviceId,
            tenantId,
        ]);
        return true;
    }
    async moveTenantService(tenantId, serviceId, direction) {
        const sorted = await this.listServicesByTenantId(tenantId);
        const idx = sorted.findIndex((s) => s.id === serviceId);
        const j = idx + direction;
        if (idx < 0 || j < 0 || j >= sorted.length) {
            return;
        }
        const a = sorted[idx];
        const b = sorted[j];
        await this.pg.exec(`UPDATE tenant_services SET catalog_order = ? WHERE id = ?`, [
            b.catalogOrder,
            a.id,
        ]);
        await this.pg.exec(`UPDATE tenant_services SET catalog_order = ? WHERE id = ?`, [
            a.catalogOrder,
            b.id,
        ]);
    }
};
exports.TenantCatalogRepository = TenantCatalogRepository;
exports.TenantCatalogRepository = TenantCatalogRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService])
], TenantCatalogRepository);
//# sourceMappingURL=tenant-catalog.repository.js.map