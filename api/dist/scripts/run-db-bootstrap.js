"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const sql_db_service_1 = require("../src/infrastructure/sql-db/sql-db.service");
async function main() {
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