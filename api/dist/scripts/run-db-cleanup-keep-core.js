"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const demo_tenant_snapshot_1 = require("./demo-tenant.snapshot");
const pg_client_service_1 = require("../src/infrastructure/sql-db/pg-client.service");
const tenant_repository_1 = require("../src/infrastructure/sql-db/repositories/tenant.repository");
const KEEP_TENANT_IDS = new Set(['tenant_spa', demo_tenant_snapshot_1.DEMO_TENANT_ID]);
const KEEP_TENANT_SLUGS = new Set(['spa-relax', demo_tenant_snapshot_1.DEMO_TENANT_SLUG]);
const KEEP_USER_IDS = new Set([
    'usr_super_1',
    'usr_admin_spa',
    demo_tenant_snapshot_1.DEMO_ADMIN_USER_ID,
    demo_tenant_snapshot_1.DEMO_EMPLOYEE_USER_ID,
]);
const KEEP_USER_EMAILS = new Set([
    'super@azenda.dev',
    'admin-spa@azenda.dev',
    demo_tenant_snapshot_1.DEMO_ADMIN_EMAIL,
    demo_tenant_snapshot_1.DEMO_EMPLOYEE_EMAIL,
]);
async function main() {
    const cwd = process.cwd();
    const monoRoot = (0, node_path_1.resolve)(cwd, '..');
    if ((0, node_fs_1.existsSync)((0, node_path_1.resolve)(monoRoot, '.env'))) {
        (0, dotenv_1.config)({ path: (0, node_path_1.resolve)(monoRoot, '.env') });
    }
    (0, dotenv_1.config)({ path: (0, node_path_1.resolve)(cwd, '.env'), override: true });
    const logger = new common_1.Logger('DbCleanupKeepCore');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const tenantsRepo = app.get(tenant_repository_1.TenantRepository);
        const pg = app.get(pg_client_service_1.PgClientService);
        const tenants = await tenantsRepo.listTenants();
        let deletedTenants = 0;
        for (const t of tenants) {
            const keep = KEEP_TENANT_IDS.has(t.id) || KEEP_TENANT_SLUGS.has(t.slug);
            if (keep) {
                logger.log(`Conservar tenant: ${t.name} (${t.id} / ${t.slug})`);
                continue;
            }
            logger.warn(`Eliminar tenant: ${t.name} (${t.id})`);
            await tenantsRepo.deleteTenant(t.id);
            deletedTenants += 1;
        }
        const userRows = await pg.queryRows(`SELECT id, email, tenant_id, role FROM users`);
        let deletedUsers = 0;
        for (const row of userRows) {
            const id = String(row.id);
            const email = String(row.email ?? '')
                .trim()
                .toLowerCase();
            const tenantId = row.tenant_id == null ? null : String(row.tenant_id);
            const keep = KEEP_USER_IDS.has(id) ||
                KEEP_USER_EMAILS.has(email) ||
                (tenantId != null && KEEP_TENANT_IDS.has(tenantId));
            if (keep) {
                logger.log(`Conservar usuario: ${email} (${id})`);
                continue;
            }
            logger.warn(`Eliminar usuario: ${email} (${id})`);
            await pg.exec(`DELETE FROM users WHERE id = ?`, [id]);
            deletedUsers += 1;
        }
        logger.log(`Limpieza terminada. Tenants eliminados: ${deletedTenants}. Usuarios eliminados: ${deletedUsers}.`);
    }
    finally {
        await app.close();
    }
}
void main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=run-db-cleanup-keep-core.js.map