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
exports.PlatformSiteConfigRepository = void 0;
const common_1 = require("@nestjs/common");
const pg_client_service_1 = require("../pg-client.service");
const sql_db_types_1 = require("../sql-db.types");
let PlatformSiteConfigRepository = class PlatformSiteConfigRepository {
    constructor(pg) {
        this.pg = pg;
    }
    round2(value) {
        return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    }
    merge(base, patch) {
        const landing = { ...base.landing };
        if (patch.landing) {
            const keys = Object.keys(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG.landing);
            for (const key of keys) {
                const v = patch.landing[key];
                if (v !== undefined) {
                    landing[key] = v;
                }
            }
        }
        const out = { ...base, landing };
        if (patch.currencyCode !== undefined) {
            const t = String(patch.currencyCode).trim().slice(0, 12);
            if (t.length) {
                out.currencyCode = t;
            }
        }
        if (patch.currencySymbol !== undefined) {
            const t = String(patch.currencySymbol).slice(0, 8);
            if (t.length) {
                out.currencySymbol = t;
            }
        }
        if (patch.planPriceBasic !== undefined) {
            out.planPriceBasic = Math.min(1_000_000, Math.max(0, this.round2(Number(patch.planPriceBasic))));
        }
        if (patch.planPricePro !== undefined) {
            out.planPricePro = Math.min(1_000_000, Math.max(0, this.round2(Number(patch.planPricePro))));
        }
        if (patch.planPriceBusiness !== undefined) {
            out.planPriceBusiness = Math.min(1_000_000, Math.max(0, this.round2(Number(patch.planPriceBusiness))));
        }
        return out;
    }
    async ensureTableAndDefaultRow() {
        const payload = JSON.stringify(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG);
        await this.pg.execScript(`
      CREATE TABLE IF NOT EXISTS platform_site_config (
        id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL
      )
    `);
        await this.pg.exec(`INSERT INTO platform_site_config (id, payload_json) VALUES ('default', ?) ON CONFLICT (id) DO NOTHING`, [payload]);
    }
    async get() {
        await this.ensureTableAndDefaultRow();
        const row = await this.pg.queryOne(`SELECT payload_json FROM platform_site_config WHERE id = 'default'`);
        if (!row?.payload_json) {
            return structuredClone(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG);
        }
        try {
            const parsed = JSON.parse(String(row.payload_json));
            return this.merge(structuredClone(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG), parsed);
        }
        catch {
            return structuredClone(sql_db_types_1.DEFAULT_PLATFORM_SITE_CONFIG);
        }
    }
    async patch(patch) {
        const current = await this.get();
        const next = this.merge(current, patch);
        await this.ensureTableAndDefaultRow();
        const json = JSON.stringify(next);
        await this.pg.exec(`UPDATE platform_site_config SET payload_json = ? WHERE id = 'default'`, [json]);
        return next;
    }
};
exports.PlatformSiteConfigRepository = PlatformSiteConfigRepository;
exports.PlatformSiteConfigRepository = PlatformSiteConfigRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService])
], PlatformSiteConfigRepository);
//# sourceMappingURL=platform-site-config.repository.js.map