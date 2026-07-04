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
var DemoBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const env_util_1 = require("../common/env.util");
const demo_seed_service_1 = require("./demo-seed.service");
let DemoBootstrapService = DemoBootstrapService_1 = class DemoBootstrapService {
    constructor(demoSeed) {
        this.demoSeed = demoSeed;
        this.logger = new common_1.Logger(DemoBootstrapService_1.name);
    }
    async onModuleInit() {
        if (!(0, env_util_1.isDemoFeaturesEnabled)()) {
            return;
        }
        try {
            await this.demoSeed.ensureDemoTenantSeed();
        }
        catch (err) {
            const code = err.code;
            const isConn = code === 'ECONNREFUSED' ||
                code === 'ENOTFOUND' ||
                code === 'ETIMEDOUT' ||
                code === 'EAI_AGAIN';
            if (isConn) {
                this.logger.warn('Seed del tenant demo omitido: sin conexion a PostgreSQL.');
                return;
            }
            this.logger.error('No se pudo asegurar el tenant demo', err);
        }
    }
};
exports.DemoBootstrapService = DemoBootstrapService;
exports.DemoBootstrapService = DemoBootstrapService = DemoBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [demo_seed_service_1.DemoSeedService])
], DemoBootstrapService);
//# sourceMappingURL=demo-bootstrap.service.js.map