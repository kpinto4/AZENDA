import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SqlDbService } from '../src/infrastructure/sql-db/sql-db.service';

/**
 * Ejecuta creación de tablas (IF NOT EXISTS), migraciones ligeras y semilla si no hay usuarios.
 * Uso: npm run db:bootstrap
 */
async function main() {
  const cwd = process.cwd();
  const monoRoot = resolve(cwd, '..');
  if (existsSync(resolve(monoRoot, '.env'))) {
    loadEnv({ path: resolve(monoRoot, '.env') });
  }
  loadEnv({ path: resolve(cwd, '.env'), override: true });
  const logger = new Logger('DbBootstrap');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const sql = app.get(SqlDbService);
    await sql.runBootstrap();
    logger.log('Bootstrap terminado.');
  } finally {
    await app.close();
  }
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
