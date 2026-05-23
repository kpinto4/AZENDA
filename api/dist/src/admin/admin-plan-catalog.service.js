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
exports.AdminPlanCatalogService = void 0;
const common_1 = require("@nestjs/common");
const plan_catalog_site_config_1 = require("../infrastructure/sql-db/plan-catalog-site-config");
const platform_site_config_repository_1 = require("../infrastructure/sql-db/repositories/platform-site-config.repository");
const tenant_repository_1 = require("../infrastructure/sql-db/repositories/tenant.repository");
let AdminPlanCatalogService = class AdminPlanCatalogService {
    constructor(tenants, platformSite) {
        this.tenants = tenants;
        this.platformSite = platformSite;
    }
    list() {
        return this.tenants.listPlanCatalog();
    }
    async replace(entries) {
        const updated = await this.tenants.replacePlanCatalog(entries);
        const pricePatch = (0, plan_catalog_site_config_1.planCatalogPricePatch)(updated);
        if (Object.keys(pricePatch).length > 0) {
            await this.platformSite.patch(pricePatch);
        }
        return updated;
    }
};
exports.AdminPlanCatalogService = AdminPlanCatalogService;
exports.AdminPlanCatalogService = AdminPlanCatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_repository_1.TenantRepository,
        platform_site_config_repository_1.PlatformSiteConfigRepository])
], AdminPlanCatalogService);
//# sourceMappingURL=admin-plan-catalog.service.js.map