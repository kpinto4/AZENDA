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
exports.AdminTenantsService = void 0;
const common_1 = require("@nestjs/common");
const auth_types_1 = require("../auth/auth.types");
const plan_modules_1 = require("../infrastructure/sql-db/plan-modules");
const tenant_billing_service_1 = require("../infrastructure/sql-db/tenant-billing.service");
const tenant_repository_1 = require("../infrastructure/sql-db/repositories/tenant.repository");
const sql_db_service_1 = require("../infrastructure/sql-db/sql-db.service");
let AdminTenantsService = class AdminTenantsService {
    constructor(tenants, billing, sqlDb) {
        this.tenants = tenants;
        this.billing = billing;
        this.sqlDb = sqlDb;
    }
    computeCycleEnd(startIso, cycle) {
        const d = new Date(startIso);
        if (cycle === 'YEARLY') {
            d.setFullYear(d.getFullYear() + 1);
        }
        else {
            d.setMonth(d.getMonth() + 1);
        }
        return d.toISOString();
    }
    async enrichTenant(t) {
        const users = await this.sqlDb.listUsersByTenantId(t.id);
        const admin = users.find((u) => u.role === auth_types_1.UserRole.ADMIN);
        return {
            ...t,
            adminEmail: admin?.email ?? null,
        };
    }
    async listTenants() {
        const rows = await this.tenants.listTenants();
        const enriched = [];
        for (const t of rows) {
            enriched.push(await this.enrichTenant(t));
        }
        return enriched;
    }
    async findById(tenantId) {
        const t = await this.tenants.findById(tenantId);
        if (!t) {
            return undefined;
        }
        return this.enrichTenant(t);
    }
    async createTenant(data) {
        const adminEmail = data.adminEmail.trim().toLowerCase();
        const existing = await this.sqlDb.findUserByEmailNormalized(adminEmail);
        if (existing) {
            throw new common_1.ConflictException('Ya existe una cuenta con ese correo');
        }
        const { adminEmail: _e, adminPassword, ...tenantData } = data;
        const tenant = await this.tenants.createTenant(tenantData);
        await this.sqlDb.createUser({
            id: `usr_${Date.now()}`,
            email: adminEmail,
            password: adminPassword,
            role: auth_types_1.UserRole.ADMIN,
            tenantId: tenant.id,
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'ACTIVE',
        });
        return this.enrichTenant(tenant);
    }
    async ensureAdminAccess(tenantId, adminEmail, adminPassword) {
        const tenant = await this.tenants.findById(tenantId);
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        const users = await this.sqlDb.listUsersByTenantId(tenantId);
        const hasAdmin = users.some((u) => u.role === auth_types_1.UserRole.ADMIN);
        if (hasAdmin) {
            throw new common_1.ConflictException('Este negocio ya tiene un usuario admin');
        }
        const email = adminEmail.trim().toLowerCase();
        const existing = await this.sqlDb.findUserByEmailNormalized(email);
        if (existing) {
            throw new common_1.ConflictException('Ya existe una cuenta con ese correo');
        }
        await this.sqlDb.createUser({
            id: `usr_${Date.now()}`,
            email,
            password: adminPassword,
            role: auth_types_1.UserRole.ADMIN,
            tenantId,
            systems: [auth_types_1.AppSystem.TENANT, auth_types_1.AppSystem.PUBLIC_BOOKING],
            status: 'ACTIVE',
        });
        return this.enrichTenant(tenant);
    }
    updateTenant(tenantId, patch) {
        return this.tenants.updateTenant(tenantId, patch);
    }
    async activateSubscription(tenantId) {
        const current = await this.tenants.findById(tenantId);
        if (!current) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        if (current.isDemoTenant) {
            throw new common_1.NotFoundException('No aplica al tenant demo');
        }
        const now = new Date().toISOString();
        const periodEnd = this.computeCycleEnd(now, current.billingCycle);
        const modules = (0, plan_modules_1.defaultModulesForPlan)(current.plan);
        const updated = await this.tenants.updateTenant(tenantId, {
            status: 'ACTIVE',
            subscriptionStatus: 'active',
            subscriptionStartedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextRenewalAt: periodEnd,
            modules,
        });
        if (!updated) {
            throw new common_1.NotFoundException('Tenant no encontrado');
        }
        return updated;
    }
    async deleteTenant(tenantId) {
        try {
            return await this.tenants.deleteTenant(tenantId);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Error al eliminar el tenant';
            throw new common_1.InternalServerErrorException(`No se pudo eliminar el negocio: ${message}`);
        }
    }
    getUpgradeQuote(params) {
        return this.billing.getUpgradeQuote(params);
    }
};
exports.AdminTenantsService = AdminTenantsService;
exports.AdminTenantsService = AdminTenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_repository_1.TenantRepository,
        tenant_billing_service_1.TenantBillingService,
        sql_db_service_1.SqlDbService])
], AdminTenantsService);
//# sourceMappingURL=admin-tenants.service.js.map