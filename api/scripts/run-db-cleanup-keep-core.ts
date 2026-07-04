import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_USER_ID,
  DEMO_EMPLOYEE_EMAIL,
  DEMO_EMPLOYEE_USER_ID,
  DEMO_TENANT_ID,
  DEMO_TENANT_SLUG,
} from './demo-tenant.snapshot';
import { PgClientService } from '../src/infrastructure/sql-db/pg-client.service';
import { TenantRepository } from '../src/infrastructure/sql-db/repositories/tenant.repository';

/** Tenants que se conservan (spa + demo). */
const KEEP_TENANT_IDS = new Set(['tenant_spa', DEMO_TENANT_ID]);
const KEEP_TENANT_SLUGS = new Set(['spa-relax', DEMO_TENANT_SLUG]);

/** Usuarios que se conservan (super admin + spa + demo). */
const KEEP_USER_IDS = new Set([
  'usr_super_1',
  'usr_admin_spa',
  DEMO_ADMIN_USER_ID,
  DEMO_EMPLOYEE_USER_ID,
]);
const KEEP_USER_EMAILS = new Set([
  'super@azenda.dev',
  'admin-spa@azenda.dev',
  DEMO_ADMIN_EMAIL,
  DEMO_EMPLOYEE_EMAIL,
]);

/**
 * Borra todos los tenants y usuarios excepto super admin, spa y demo.
 * Uso (desde api/): npx ts-node -r tsconfig-paths/register scripts/run-db-cleanup-keep-core.ts
 */
async function main() {
  const cwd = process.cwd();
  const monoRoot = resolve(cwd, '..');
  if (existsSync(resolve(monoRoot, '.env'))) {
    loadEnv({ path: resolve(monoRoot, '.env') });
  }
  loadEnv({ path: resolve(cwd, '.env'), override: true });

  const logger = new Logger('DbCleanupKeepCore');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const tenantsRepo = app.get(TenantRepository);
    const pg = app.get(PgClientService);

    const tenants = await tenantsRepo.listTenants();
    let deletedTenants = 0;
    for (const t of tenants) {
      const keep =
        KEEP_TENANT_IDS.has(t.id) || KEEP_TENANT_SLUGS.has(t.slug);
      if (keep) {
        logger.log(`Conservar tenant: ${t.name} (${t.id} / ${t.slug})`);
        continue;
      }
      logger.warn(`Eliminar tenant: ${t.name} (${t.id})`);
      await tenantsRepo.deleteTenant(t.id);
      deletedTenants += 1;
    }

    const userRows = await pg.queryRows(
      `SELECT id, email, tenant_id, role FROM users`,
    );
    let deletedUsers = 0;
    for (const row of userRows) {
      const id = String(row.id);
      const email = String(row.email ?? '')
        .trim()
        .toLowerCase();
      const tenantId =
        row.tenant_id == null ? null : String(row.tenant_id);
      const keep =
        KEEP_USER_IDS.has(id) ||
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

    logger.log(
      `Limpieza terminada. Tenants eliminados: ${deletedTenants}. Usuarios eliminados: ${deletedUsers}.`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
