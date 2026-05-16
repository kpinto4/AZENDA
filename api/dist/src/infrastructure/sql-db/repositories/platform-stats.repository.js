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
exports.PlatformStatsRepository = void 0;
const common_1 = require("@nestjs/common");
const pg_client_service_1 = require("../pg-client.service");
let PlatformStatsRepository = class PlatformStatsRepository {
    constructor(pg) {
        this.pg = pg;
    }
    n(row, key) {
        if (!row) {
            return 0;
        }
        const v = row[key];
        if (v == null) {
            return 0;
        }
        const x = Number(v);
        return Number.isFinite(x) ? x : 0;
    }
    async loadOverview() {
        const [tenantsRow, activeTenantsRow, apptsRow, salesRow, tenantUsersRow, modAggRow, mrrRow,] = await Promise.all([
            this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM tenants`, []),
            this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM tenants WHERE UPPER(status) = ?`, ['ACTIVE']),
            this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM appointments`, []),
            this.pg.queryOne(`
          SELECT COUNT(*)::bigint AS cnt,
                 COALESCE(SUM(total), 0)::numeric AS total_sum
          FROM tenant_sales
        `, []),
            this.pg.queryOne(`SELECT COUNT(*)::bigint AS c FROM users WHERE tenant_id IS NOT NULL`, []),
            this.pg.queryOne(`
          SELECT
            COUNT(*) FILTER (WHERE citas_enabled)::bigint AS ccitas,
            COUNT(*) FILTER (WHERE ventas_enabled)::bigint AS cventas,
            COUNT(*) FILTER (WHERE inventario_enabled)::bigint AS cinv
          FROM tenants
        `, []),
            this.pg.queryOne(`
          SELECT COALESCE(SUM(plan_price_monthly), 0)::numeric AS s
          FROM tenants
          WHERE UPPER(status) = ?
        `, ['ACTIVE']),
        ]);
        return {
            tenantCount: Math.floor(this.n(tenantsRow, 'c')),
            activeTenantCount: Math.floor(this.n(activeTenantsRow, 'c')),
            appointmentCount: Math.floor(this.n(apptsRow, 'c')),
            salesCount: Math.floor(this.n(salesRow, 'cnt')),
            salesTotalCop: Math.round(this.n(salesRow, 'total_sum') * 100) / 100,
            tenantPanelUserCount: Math.floor(this.n(tenantUsersRow, 'c')),
            stockMovementsCount: 0,
            tenantsWithModuleCitas: Math.floor(this.n(modAggRow, 'ccitas')),
            tenantsWithModuleVentas: Math.floor(this.n(modAggRow, 'cventas')),
            tenantsWithModuleInventario: Math.floor(this.n(modAggRow, 'cinv')),
            estimatedMrrMonthlyCop: Math.round(this.n(mrrRow, 's') * 100) / 100,
        };
    }
};
exports.PlatformStatsRepository = PlatformStatsRepository;
exports.PlatformStatsRepository = PlatformStatsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService])
], PlatformStatsRepository);
//# sourceMappingURL=platform-stats.repository.js.map