"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlDbModule = void 0;
const common_1 = require("@nestjs/common");
const password_module_1 = require("../../auth/password.module");
const pg_client_service_1 = require("./pg-client.service");
const appointment_repository_1 = require("./repositories/appointment.repository");
const platform_site_config_repository_1 = require("./repositories/platform-site-config.repository");
const platform_stats_repository_1 = require("./repositories/platform-stats.repository");
const tenant_branding_repository_1 = require("./repositories/tenant-branding.repository");
const tenant_catalog_repository_1 = require("./repositories/tenant-catalog.repository");
const tenant_retail_repository_1 = require("./repositories/tenant-retail.repository");
const tenant_repository_1 = require("./repositories/tenant.repository");
const user_repository_1 = require("./repositories/user.repository");
const sql_db_service_1 = require("./sql-db.service");
const tenant_billing_service_1 = require("./tenant-billing.service");
let SqlDbModule = class SqlDbModule {
};
exports.SqlDbModule = SqlDbModule;
exports.SqlDbModule = SqlDbModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [password_module_1.PasswordModule],
        providers: [
            pg_client_service_1.PgClientService,
            user_repository_1.UserRepository,
            tenant_repository_1.TenantRepository,
            tenant_billing_service_1.TenantBillingService,
            tenant_branding_repository_1.TenantBrandingRepository,
            platform_site_config_repository_1.PlatformSiteConfigRepository,
            platform_stats_repository_1.PlatformStatsRepository,
            appointment_repository_1.AppointmentRepository,
            tenant_catalog_repository_1.TenantCatalogRepository,
            tenant_retail_repository_1.TenantRetailRepository,
            sql_db_service_1.SqlDbService,
        ],
        exports: [
            sql_db_service_1.SqlDbService,
            user_repository_1.UserRepository,
            tenant_repository_1.TenantRepository,
            tenant_billing_service_1.TenantBillingService,
            tenant_branding_repository_1.TenantBrandingRepository,
            platform_site_config_repository_1.PlatformSiteConfigRepository,
            platform_stats_repository_1.PlatformStatsRepository,
        ],
    })
], SqlDbModule);
//# sourceMappingURL=sql-db.module.js.map