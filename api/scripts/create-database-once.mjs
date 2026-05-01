/**
 * Ejecutar UNA VEZ para crear la base de datos en PostgreSQL.
 * Idempotente: si ya existe, no falla.
 * Luego ejecuta: npm run db:bootstrap
 *
 * Variables: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE (default azenda)
 */
import pg from 'pg';

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
