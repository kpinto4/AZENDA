"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_platform_stats_controller_1 = require("./admin-platform-stats.controller");
const admin_platform_stats_service_1 = require("./admin-platform-stats.service");
const admin_plan_catalog_controller_1 = require("./admin-plan-catalog.controller");
const admin_plan_catalog_service_1 = require("./admin-plan-catalog.service");
const admin_site_config_controller_1 = require("./admin-site-config.controller");
const admin_site_config_service_1 = require("./admin-site-config.service");
const admin_tenants_controller_1 = require("./admin-tenants.controller");
const admin_tenants_service_1 = require("./admin-tenants.service");
const admin_users_controller_1 = require("./admin-users.controller");
const admin_users_service_1 = require("./admin-users.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            admin_tenants_controller_1.AdminTenantsController,
            admin_users_controller_1.AdminUsersController,
            admin_plan_catalog_controller_1.AdminPlanCatalogController,
            admin_site_config_controller_1.AdminSiteConfigController,
            admin_platform_stats_controller_1.AdminPlatformStatsController,
        ],
        providers: [
            admin_tenants_service_1.AdminTenantsService,
            admin_users_service_1.AdminUsersService,
            admin_plan_catalog_service_1.AdminPlanCatalogService,
            admin_site_config_service_1.AdminSiteConfigService,
            admin_platform_stats_service_1.AdminPlatformStatsService,
        ],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map