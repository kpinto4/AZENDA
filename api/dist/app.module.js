"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const access_controller_1 = require("./access/access.controller");
const sql_db_module_1 = require("./infrastructure/sql-db/sql-db.module");
const tenant_module_1 = require("./tenant/tenant.module");
const admin_module_1 = require("./admin/admin.module");
const public_module_1 = require("./public/public.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [sql_db_module_1.SqlDbModule, auth_module_1.AuthModule, tenant_module_1.TenantModule, admin_module_1.AdminModule, public_module_1.PublicModule],
        controllers: [app_controller_1.AppController, access_controller_1.AccessController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map