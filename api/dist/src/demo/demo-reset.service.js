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
var DemoResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoResetService = void 0;
const common_1 = require("@nestjs/common");
const demo_tenant_snapshot_1 = require("../../scripts/demo-tenant.snapshot");
const pg_client_service_1 = require("../infrastructure/sql-db/pg-client.service");
const demo_seed_service_1 = require("./demo-seed.service");
let DemoResetService = DemoResetService_1 = class DemoResetService {
    constructor(pg, demoSeed) {
        this.pg = pg;
        this.demoSeed = demoSeed;
        this.logger = new common_1.Logger(DemoResetService_1.name);
    }
    async resetDemoTenantPartial() {
        const tenantId = demo_tenant_snapshot_1.DEMO_TENANT_ID;
        const demoRow = await this.pg.queryOne(`SELECT id FROM tenants WHERE id = ? AND is_demo_tenant = true`, [tenantId]);
        if (!demoRow) {
            throw new Error('Tenant demo no encontrado o no marcado como demo');
        }
        const appointmentsDeleted = await this.countThenDelete(`SELECT COUNT(*) AS cnt FROM appointments WHERE tenant_id = ?`, `DELETE FROM appointments WHERE tenant_id = ?`, [tenantId]);
        const salesDeleted = await this.countThenDelete(`SELECT COUNT(*) AS cnt FROM tenant_sales WHERE tenant_id = ?`, `DELETE FROM tenant_sales WHERE tenant_id = ?`, [tenantId]);
        const visitsDeleted = await this.countThenDelete(`SELECT COUNT(*) AS cnt FROM store_visit_logs WHERE tenant_id = ?`, `DELETE FROM store_visit_logs WHERE tenant_id = ?`, [tenantId]);
        const stockMovementsDeleted = await this.countThenDelete(`SELECT COUNT(*) AS cnt FROM tenant_stock_movements WHERE tenant_id = ?`, `DELETE FROM tenant_stock_movements WHERE tenant_id = ?`, [tenantId]);
        const nonCoreServicesDeleted = await this.countThenDelete(`SELECT COUNT(*) AS cnt FROM tenant_services WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`, `DELETE FROM tenant_services WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`, [tenantId]);
        const nonCoreProductsDeleted = await this.countThenDelete(`SELECT COUNT(*) AS cnt FROM tenant_products WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`, `DELETE FROM tenant_products WHERE tenant_id = ? AND (is_demo_core IS NULL OR is_demo_core = false)`, [tenantId]);
        await this.demoSeed.restoreCoreCatalogFromSnapshot();
        await this.demoSeed.insertVolatileSample();
        const coreServicesPreserved = await this.countCore('tenant_services');
        const coreProductsPreserved = await this.countCore('tenant_products');
        const result = {
            tenantId,
            appointmentsDeleted,
            salesDeleted,
            visitsDeleted,
            stockMovementsDeleted,
            nonCoreServicesDeleted,
            nonCoreProductsDeleted,
            coreServicesPreserved,
            coreProductsPreserved,
            volatileReinserted: true,
        };
        this.logger.log(`Reset demo parcial: citas=${appointmentsDeleted}, ventas=${salesDeleted}, ` +
            `core servicios=${coreServicesPreserved}/${demo_tenant_snapshot_1.DEMO_CORE_SERVICES.length}, ` +
            `core productos=${coreProductsPreserved}/${demo_tenant_snapshot_1.DEMO_CORE_PRODUCTS.length}`);
        return result;
    }
    async countThenDelete(countSql, deleteSql, params) {
        const row = await this.pg.queryOne(countSql, params);
        const cnt = Number(row?.cnt ?? 0);
        await this.pg.exec(deleteSql, params);
        return cnt;
    }
    async countCore(table) {
        const row = await this.pg.queryOne(`SELECT COUNT(*) AS cnt FROM ${table} WHERE tenant_id = ? AND is_demo_core = true`, [demo_tenant_snapshot_1.DEMO_TENANT_ID]);
        return Number(row?.cnt ?? 0);
    }
};
exports.DemoResetService = DemoResetService;
exports.DemoResetService = DemoResetService = DemoResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService,
        demo_seed_service_1.DemoSeedService])
], DemoResetService);
//# sourceMappingURL=demo-reset.service.js.map