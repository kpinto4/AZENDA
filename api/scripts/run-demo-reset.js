"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const demo_reset_service_1 = require("../src/demo/demo-reset.service");
async function main() {
    const cwd = process.cwd();
    const monoRoot = (0, node_path_1.resolve)(cwd, '..');
    if ((0, node_fs_1.existsSync)((0, node_path_1.resolve)(monoRoot, '.env'))) {
        (0, dotenv_1.config)({ path: (0, node_path_1.resolve)(monoRoot, '.env') });
    }
    (0, dotenv_1.config)({ path: (0, node_path_1.resolve)(cwd, '.env'), override: true });
    const logger = new common_1.Logger('DemoReset');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const reset = app.get(demo_reset_service_1.DemoResetService);
        const result = await reset.resetDemoTenantPartial();
        logger.log(`Reset demo terminado: ${JSON.stringify(result)}`);
    }
    finally {
        await app.close();
    }
}
void main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=run-demo-reset.js.map