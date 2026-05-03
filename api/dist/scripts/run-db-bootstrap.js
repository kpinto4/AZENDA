"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const sql_db_service_1 = require("../src/infrastructure/sql-db/sql-db.service");
async function main() {
    const cwd = process.cwd();
    const monoRoot = (0, node_path_1.resolve)(cwd, '..');
    if ((0, node_fs_1.existsSync)((0, node_path_1.resolve)(monoRoot, '.env'))) {
        (0, dotenv_1.config)({ path: (0, node_path_1.resolve)(monoRoot, '.env') });
    }
    (0, dotenv_1.config)({ path: (0, node_path_1.resolve)(cwd, '.env'), override: true });
    const logger = new common_1.Logger('DbBootstrap');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const sql = app.get(sql_db_service_1.SqlDbService);
        await sql.runBootstrap();
        logger.log('Bootstrap terminado.');
    }
    finally {
        await app.close();
    }
}
void main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=run-db-bootstrap.js.map