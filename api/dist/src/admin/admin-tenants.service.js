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
const tenant_billing_service_1 = require("../infrastructure/sql-db/tenant-billing.service");
const tenant_repository_1 = require("../infrastructure/sql-db/repositories/tenant.repository");
let AdminTenantsService = class AdminTenantsService {
    constructor(tenants, billing) {
        this.tenants = tenants;
        this.billing = billing;
    }
    listTenants() {
        return this.tenants.listTenants();
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
        tenant_billing_service_1.TenantBillingService])
], AdminTenantsService);
//# sourceMappingURL=admin-tenants.service.js.map