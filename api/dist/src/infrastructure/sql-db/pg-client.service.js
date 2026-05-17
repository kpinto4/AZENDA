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
var PgClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgClientService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let PgClientService = PgClientService_1 = class PgClientService {
    constructor() {
        this.logger = new common_1.Logger(PgClientService_1.name);
        const connectionString = process.env.DATABASE_URL?.trim();
        if (!connectionString) {
            throw new Error('DATABASE_URL es obligatorio. Este proyecto usa Neon como base principal.');
        }
        const sslMode = (process.env.PGSSLMODE ?? '').trim().toLowerCase();
        const requireSsl = sslMode === 'require' ||
            ['1', 'true', 'yes', 'on'].includes(String(process.env.PGSSL ?? '')
                .trim()
                .toLowerCase()) ||
            (connectionString?.toLowerCase().includes('sslmode=require') ?? false);
        const ssl = requireSsl ? { rejectUnauthorized: false } : undefined;
        this.pool = new pg_1.Pool({
            connectionString,
            ssl,
            max: 10,
        });
        let hostHint = 'remoto';
        try {
            const u = new URL(connectionString);
            if (u.hostname) {
                hostHint = u.hostname;
            }
        }
        catch {
        }
        this.logger.log(`Postgres por DATABASE_URL (${hostHint}; p. ej. Neon)`);
    }
    async onModuleDestroy() {
        await this.pool.end();
    }
    toPgSql(sql) {
        let n = 0;
        return sql.replace(/\?/g, () => `$${++n}`);
    }
    async queryRows(sql, params = []) {
        const res = await this.pool.query(this.toPgSql(sql), params);
        return res.rows;
    }
    async queryOne(sql, params = []) {
        const rows = await this.queryRows(sql, params);
        return rows[0];
    }
    async exec(sql, params = []) {
        await this.pool.query(this.toPgSql(sql), params);
    }
    async execScript(sql) {
        await this.pool.query(sql);
    }
    async ensureIndex(createSql) {
        try {
            await this.pool.query(createSql);
        }
        catch (e) {
            const code = e.code;
            if (code === '42P07') {
                return;
            }
            throw e;
        }
    }
};
exports.PgClientService = PgClientService;
exports.PgClientService = PgClientService = PgClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PgClientService);
//# sourceMappingURL=pg-client.service.js.map