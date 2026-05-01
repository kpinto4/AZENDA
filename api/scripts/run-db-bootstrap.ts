import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SqlDbService } from '../src/infrastructure/sql-db/sql-db.service';

/**
 * Ejecuta creación de tablas (IF NOT EXISTS), migraciones ligeras y semilla si no hay usuarios.
 * Uso: npm run db:bootstrap
 */
async function main() {
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
