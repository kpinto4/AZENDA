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
var UserRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const password_service_1 = require("../../../auth/password.service");
const pg_client_service_1 = require("../pg-client.service");
let UserRepository = UserRepository_1 = class UserRepository {
    constructor(pg, passwordService) {
        this.pg = pg;
        this.passwordService = passwordService;
        this.logger = new common_1.Logger(UserRepository_1.name);
    }
    mapUserRow(row) {
        return {
            id: String(row.id),
            email: String(row.email),
            password: String(row.password),
            role: row.role,
            tenantId: row.tenant_id ? String(row.tenant_id) : null,
            systems: JSON.parse(String(row.systems)),
            status: row.status,
        };
    }
    async findByEmailNormalized(normalizedEmail) {
        const row = await this.pg.queryOne(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE LOWER(TRIM(email)) = ?
      `, [normalizedEmail.trim().toLowerCase()]);
        return row ? this.mapUserRow(row) : undefined;
    }
    async findById(userId) {
        const row = await this.pg.queryOne(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE id = ?
      `, [userId]);
        return row ? this.mapUserRow(row) : undefined;
    }
    async listAll() {
        const rows = await this.pg.queryRows(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        ORDER BY email ASC
      `);
        return rows.map((row) => this.mapUserRow(row));
    }
    async listByTenantId(tenantId) {
        const rows = await this.pg.queryRows(`
        SELECT id, email, password, role, tenant_id, systems, status
        FROM users
        WHERE tenant_id = ?
        ORDER BY email ASC
      `, [tenantId]);
        return rows.map((row) => this.mapUserRow(row));
    }
    async create(data) {
        const passwordStored = this.passwordService.isBcryptHash(data.password)
            ? data.password
            : await this.passwordService.hash(data.password);
        const row = { ...data, password: passwordStored };
        await this.pg.exec(`
        INSERT INTO users (id, email, password, role, tenant_id, systems, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
            row.id,
            row.email,
            row.password,
            row.role,
            row.tenantId,
            JSON.stringify(row.systems),
            row.status,
        ]);
        return row;
    }
    async update(userId, patch) {
        const current = await this.findById(userId);
        if (!current) {
            return undefined;
        }
        let nextPassword = current.password;
        if (patch.password !== undefined &&
            String(patch.password).trim().length > 0) {
            const p = String(patch.password);
            nextPassword = this.passwordService.isBcryptHash(p)
                ? p
                : await this.passwordService.hash(p);
        }
        const next = {
            id: current.id,
            email: patch.email !== undefined ? patch.email : current.email,
            password: nextPassword,
            role: patch.role !== undefined ? patch.role : current.role,
            tenantId: patch.tenantId !== undefined ? patch.tenantId : current.tenantId,
            systems: patch.systems !== undefined ? patch.systems : current.systems,
            status: patch.status !== undefined ? patch.status : current.status,
        };
        await this.pg.exec(`
        UPDATE users
        SET email = ?, password = ?, role = ?, tenant_id = ?, systems = ?, status = ?
        WHERE id = ?
      `, [
            next.email,
            next.password,
            next.role,
            next.tenantId,
            JSON.stringify(next.systems),
            next.status,
            userId,
        ]);
        return next;
    }
    async delete(userId) {
        const existing = await this.findById(userId);
        if (!existing) {
            return false;
        }
        await this.pg.exec(`DELETE FROM users WHERE id = ?`, [userId]);
        return true;
    }
    async deleteByTenant(userId, tenantId) {
        const existing = await this.findById(userId);
        if (!existing || existing.tenantId !== tenantId) {
            return false;
        }
        await this.pg.exec(`DELETE FROM users WHERE id = ? AND tenant_id = ?`, [
            userId,
            tenantId,
        ]);
        return true;
    }
    async migrateLegacyPlaintextPasswords() {
        const rows = await this.pg.queryRows(`SELECT id, password FROM users WHERE password IS NOT NULL AND password NOT LIKE '$2%'`);
        for (const r of rows) {
            const id = String(r.id);
            const plain = String(r.password);
            const hash = await this.passwordService.hash(plain);
            await this.pg.exec(`UPDATE users SET password = ? WHERE id = ?`, [
                hash,
                id,
            ]);
            this.logger.log(`Clave de usuario ${id} migrada a hash (login compatible).`);
        }
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = UserRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pg_client_service_1.PgClientService,
        password_service_1.PasswordService])
], UserRepository);
//# sourceMappingURL=user.repository.js.map