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
    async listTenants() {
        const rows = await this.tenants.listTenants();
        const enriched = [];
        for (const t of rows) {
            const users = await this.sqlDb.listUsersByTenantId(t.id);
            const admin = users.find((u) => u.role === auth_types_1.UserRole.ADMIN);
            enriched.push({
                ...t,
                adminEmail: admin?.email ?? null,
            });
        }
        return enriched;
    }
    findById(tenantId) {
        return this.tenants.findById(tenantId);
    }
    createTenant(data) {
        return this.tenants.createTenant(data);
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
    deleteTenant(tenantId) {
        return this.tenants.deleteTenant(tenantId);
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