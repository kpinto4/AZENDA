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
exports.TenantSalesService = void 0;
const common_1 = require("@nestjs/common");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
let TenantSalesService = class TenantSalesService {
    constructor(sqlDb) {
        this.sqlDb = sqlDb;
    }
    async assertTenantSalesModule(user) {
        if (!user.tenantId) {
            throw new common_1.ForbiddenException('Usuario sin tenant');
        }
        const tenant = await this.sqlDb.findTenantById(user.tenantId);
        if (!tenant?.modules.ventas) {
            throw new common_1.ForbiddenException('El modulo de ventas no esta activo para este tenant');
        }
        return user.tenantId;
    }
    async list(user) {
        const tenantId = await this.assertTenantSalesModule(user);
        return this.sqlDb.listTenantSalesByTenantId(tenantId);
    }
    async create(user, dto) {
        const tenantId = await this.assertTenantSalesModule(user);
        const saleDate = this.normalizeSaleDate(dto.saleDate);
        const total = Number(dto.total);
        let linkedAppointmentId = null;
        if (dto.linkedAppointmentId?.trim()) {
            const appt = await this.sqlDb.findAppointmentById(dto.linkedAppointmentId.trim());
            if (!appt || appt.tenantId !== tenantId) {
                throw new common_1.BadRequestException('La cita vinculada no existe o no pertenece a este negocio');
            }
            linkedAppointmentId = appt.id;
        }
        let stockNote = null;
        if (dto.productId?.trim()) {
            const qty = dto.quantity ?? 1;
            const products = await this.sqlDb.listProductsByTenantId(tenantId);
            const product = products.find((p) => p.id === dto.productId.trim());
            if (!product) {
                throw new common_1.BadRequestException('Producto no encontrado en el catalogo');
            }
            if (product.stock < qty) {
                throw new common_1.BadRequestException(`Stock insuficiente para ${product.name} (disponible: ${product.stock})`);
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
    normalizeSaleDate(input) {
        if (!input?.trim()) {
            return new Date().toISOString().slice(0, 10);
        }
        const t = input.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
            return t;
        }
        const d = new Date(t);
        if (Number.isNaN(d.getTime())) {
            throw new common_1.BadRequestException('Fecha de venta invalida');
        }
        return d.toISOString().slice(0, 10);
    }
};
exports.TenantSalesService = TenantSalesService;
exports.TenantSalesService = TenantSalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sql_db_service_1.SqlDbService])
], TenantSalesService);
//# sourceMappingURL=tenant-sales.service.js.map