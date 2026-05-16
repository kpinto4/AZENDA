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
exports.AdminSiteConfigService = void 0;
const common_1 = require("@nestjs/common");
const platform_site_config_repository_1 = require("../infrastructure/sql-db/repositories/platform-site-config.repository");
let AdminSiteConfigService = class AdminSiteConfigService {
    constructor(site) {
        this.site = site;
    }
    get() {
        return this.site.get();
    }
    patch(dto) {
        return this.site.patch(dto);
    }
};
exports.AdminSiteConfigService = AdminSiteConfigService;
exports.AdminSiteConfigService = AdminSiteConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [platform_site_config_repository_1.PlatformSiteConfigRepository])
], AdminSiteConfigService);
//# sourceMappingURL=admin-site-config.service.js.map