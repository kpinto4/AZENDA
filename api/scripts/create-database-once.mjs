/**
 * Ejecutar UNA VEZ para crear la base de datos en PostgreSQL local.
 * Idempotente: si ya existe, no falla.
 * Con Neon u otro remoto: define DATABASE_URL en api/.env y omite este script (Neon ya trae la base).
 *
 * Variables: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE (default azenda)
 */
import { existsSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(scriptDir, '..');
const monoRoot = resolve(apiDir, '..');
if (existsSync(resolve(monoRoot, '.env'))) {
  loadEnv({ path: resolve(monoRoot, '.env') });
}
loadEnv({ path: resolve(apiDir, '.env'), override: true });

const dbUrl = process.env.DATABASE_URL?.trim();
if (dbUrl) {
  console.log(
    'DATABASE_URL esta definida (p. ej. Neon): no aplica CREATE DATABASE local. Siguiente: npm run db:bootstrap',
  );
  process.exit(0);
}

const host = process.env.PGHOST ?? '127.0.0.1';
const port = Number(process.env.PGPORT ?? 5432);
const user = process.env.PGUSER ?? 'postgres';
const password = process.env.PGPASSWORD ?? 'postgres';
const database = (process.env.PGDATABASE ?? 'azenda').trim();

async function main() {
  const client = new pg.Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });
  await client.connect();

  const safeName = database.replace(/[^a-zA-Z0-9_]/g, '_');
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [safeName]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE ${safeName}`);
  }
  await client.end();

  console.log(`Listo: base "${safeName}" existe (o ya existia).`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
